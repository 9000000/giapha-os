'use server'

import { getIsAdmin } from '@/utils/supabase/queries'
import packageJson from '@/package.json'
import postgres from 'postgres'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const SOURCE_REPOSITORY = 'homielab/giapha-os'
const SOURCE_BRANCH = 'main'
const SOURCE_README_URL = `https://github.com/${SOURCE_REPOSITORY}/blob/${SOURCE_BRANCH}/README.md#hướng-dẫn-cập-nhật-source-code`
const SOURCE_PACKAGE_URL = `https://raw.githubusercontent.com/${SOURCE_REPOSITORY}/${SOURCE_BRANCH}/package.json`

const MIGRATION_FILES = [
  'docs/schema.sql',
  'docs/migrations/20260312015736_add_lunar_death_date.sql',
  'docs/migrations/20260320230020_add_editor_permission.sql',
  'docs/migrations/20260524125731_add_gallery.sql',
  'docs/migrations/20260831140135_security_and_approval_hardening.sql'
] as const

const MIGRATION_TABLE = 'public.app_migrations'

interface MigrationDefinition {
  id: string
  file: string
  sql: string
}

export interface MigrationStatus {
  configured: boolean
  databaseReachable: boolean
  error?: string
  source: SourceVersionStatus
  migrations: Array<{
    id: string
    file: string
    appliedAt: string | null
  }>
}

export type SourceVersionState = 'current' | 'outdated' | 'unknown'

export interface SourceVersionStatus {
  state: SourceVersionState
  currentVersion: string | null
  latestVersion: string | null
  readmeUrl: string
  error?: string
}

interface ParsedVersion {
  major: number
  minor: number
  patch: number
  prerelease: string[]
}

function parseVersion(value: unknown): ParsedVersion | null {
  if (typeof value !== 'string') return null

  const match = value
    .trim()
    .match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/)
  if (!match) return null

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : []
  }
}

function compareVersions(left: ParsedVersion, right: ParsedVersion) {
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (left[key] !== right[key]) return left[key] > right[key] ? 1 : -1
  }

  if (!left.prerelease.length && !right.prerelease.length) return 0
  if (!left.prerelease.length) return 1
  if (!right.prerelease.length) return -1

  const length = Math.max(left.prerelease.length, right.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    const leftPart = left.prerelease[index]
    const rightPart = right.prerelease[index]
    if (leftPart === undefined) return -1
    if (rightPart === undefined) return 1
    if (leftPart === rightPart) continue

    const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : null
    const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : null
    if (leftNumber !== null && rightNumber !== null) {
      return leftNumber > rightNumber ? 1 : -1
    }
    if (leftNumber !== null) return -1
    if (rightNumber !== null) return 1
    return leftPart > rightPart ? 1 : -1
  }

  return 0
}

export async function getSourceVersionStatus(): Promise<SourceVersionStatus> {
  const currentVersion = parseVersion(packageJson.version)
  const currentVersionLabel =
    typeof packageJson.version === 'string' ? packageJson.version : null

  try {
    const response = await fetch(SOURCE_PACKAGE_URL, {
      next: { revalidate: 300 }
    })

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`)
    }

    const data = (await response.json()) as { version?: unknown }
    const latestVersionLabel =
      typeof data.version === 'string' ? data.version : null
    const latestVersion = parseVersion(data.version)

    if (!latestVersion || !latestVersionLabel) {
      throw new Error('GitHub package.json did not include a valid version.')
    }

    const comparison = currentVersion
      ? compareVersions(currentVersion, latestVersion)
      : null

    return {
      state:
        comparison === null
          ? 'unknown'
          : comparison < 0
            ? 'outdated'
            : 'current',
      currentVersion: currentVersionLabel,
      latestVersion: latestVersionLabel,
      readmeUrl: SOURCE_README_URL,
      ...(comparison !== null
        ? {}
        : { error: 'Không xác định được version trong package.json hiện tại.' })
    }
  } catch (error) {
    console.error('Cannot inspect source version:', error)
    return {
      state: 'unknown',
      currentVersion: currentVersionLabel,
      latestVersion: null,
      readmeUrl: SOURCE_README_URL,
      error: 'Không thể kiểm tra version source code trên GitHub.'
    }
  }
}

async function getMigrationDefinitions(): Promise<MigrationDefinition[]> {
  return Promise.all(
    MIGRATION_FILES.map(async (file) => ({
      id: file,
      file,
      sql: await fs.readFile(
        file === 'docs/schema.sql'
          ? path.join(process.cwd(), 'docs', 'schema.sql')
          : path.join(process.cwd(), 'docs', 'migrations', path.basename(file)),
        'utf8'
      )
    }))
  )
}

function createDatabaseClient() {
  const databaseUrl = process.env.SUPABASE_DB_URL?.trim()
  if (!databaseUrl) return null

  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error('SUPABASE_DB_URL must be a PostgreSQL connection string.')
  }

  return postgres(databaseUrl, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    prepare: false
  })
}

async function ensureMigrationTable(sql: ReturnType<typeof postgres>) {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      migration_id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE ${MIGRATION_TABLE} ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON ${MIGRATION_TABLE} FROM PUBLIC, anon, authenticated;
  `)
}

export async function getMigrationStatus(): Promise<MigrationStatus> {
  const isAdmin = await getIsAdmin()
  const definitions = await getMigrationDefinitions()

  if (!isAdmin) {
    return {
      configured: Boolean(process.env.SUPABASE_DB_URL),
      databaseReachable: false,
      error: 'Từ chối truy cập.',
      source: {
        state: 'unknown',
        currentVersion: null,
        latestVersion: null,
        readmeUrl: SOURCE_README_URL
      },
      migrations: definitions.map(({ id, file }) => ({
        id,
        file,
        appliedAt: null
      }))
    }
  }

  const source = await getSourceVersionStatus()

  const sql = createDatabaseClient()
  if (!sql) {
    return {
      configured: false,
      databaseReachable: false,
      error: 'Chưa cấu hình SUPABASE_DB_URL trên server.',
      source,
      migrations: definitions.map(({ id, file }) => ({
        id,
        file,
        appliedAt: null
      }))
    }
  }

  try {
    await ensureMigrationTable(sql)
    const rows = await sql.unsafe<
      Array<{
        migration_id: string
        applied_at: string
      }>
    >(
      `SELECT migration_id, applied_at FROM ${MIGRATION_TABLE} ORDER BY applied_at ASC`
    )
    const applied = new Map(
      rows.map((row) => [
        row.migration_id,
        new Date(row.applied_at).toISOString()
      ])
    )

    return {
      configured: true,
      databaseReachable: true,
      source,
      migrations: definitions.map((migration) => ({
        id: migration.id,
        file: migration.file,
        appliedAt: applied.get(migration.id) || null
      }))
    }
  } catch (error) {
    console.error('Cannot inspect migration status:', error)
    return {
      configured: true,
      databaseReachable: false,
      error: 'Không thể kết nối hoặc đọc trạng thái migration.',
      source,
      migrations: definitions.map(({ id, file }) => ({
        id,
        file,
        appliedAt: null
      }))
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

export async function runPendingMigrations() {
  const isAdmin = await getIsAdmin()
  if (!isAdmin) return { success: false, error: 'Từ chối truy cập.' }

  const source = await getSourceVersionStatus()
  if (source.state !== 'current') {
    return {
      success: false,
      error:
        source.state === 'outdated'
          ? 'Source code chưa ở version mới nhất. Hãy cập nhật source code rồi thử lại.'
          : 'Không thể xác minh version source code. Migration đã bị tạm khóa.'
    }
  }

  const sql = createDatabaseClient()
  if (!sql) {
    return {
      success: false,
      error: 'Chưa cấu hình SUPABASE_DB_URL trên server.'
    }
  }

  try {
    const definitions = await getMigrationDefinitions()
    const result = await sql.begin(async (transaction) => {
      await transaction.unsafe(`
        CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
          migration_id TEXT PRIMARY KEY,
          file_name TEXT NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE ${MIGRATION_TABLE} ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON ${MIGRATION_TABLE} FROM PUBLIC, anon, authenticated;
        SELECT pg_advisory_xact_lock(hashtext('giapha_os_app_migrations'));
      `)

      const rows = await transaction.unsafe<
        Array<{ migration_id: string; applied_at: string }>
      >(`SELECT migration_id, applied_at FROM ${MIGRATION_TABLE}`)
      const applied = new Map(
        rows.map((row) => [row.migration_id, row.applied_at])
      )
      const appliedNow: string[] = []

      for (const migration of definitions) {
        if (applied.has(migration.id)) continue

        try {
          await transaction.unsafe(migration.sql)
          await transaction`
            INSERT INTO public.app_migrations (migration_id, file_name)
            VALUES (${migration.id}, ${migration.file})
            ON CONFLICT (migration_id) DO NOTHING
          `
          appliedNow.push(migration.file)
        } catch (error) {
          console.error(`Migration failed: ${migration.file}`, error)
          throw new Error(`Migration failed: ${migration.file}`)
        }
      }

      return appliedNow
    })

    return {
      success: true,
      applied: result,
      message: result.length
        ? `Đã chạy ${result.length} migration.`
        : 'Database đã ở phiên bản mới nhất.'
    }
  } catch (error) {
    console.error('Cannot run pending migrations:', error)
    return {
      success: false,
      error:
        error instanceof Error && error.message.startsWith('Migration failed:')
          ? `Không thể chạy ${error.message.replace('Migration failed: ', '')}.`
          : 'Không thể chạy migration. Kiểm tra SUPABASE_DB_URL và log server.'
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}
