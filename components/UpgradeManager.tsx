'use client'

import {
  getMigrationStatus,
  runPendingMigrations,
  type MigrationStatus
} from '@/app/actions/migrations'
import {
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ServerCog
} from 'lucide-react'
import { useMemo, useState } from 'react'

export default function UpgradeManager({
  initialStatus
}: {
  initialStatus: MigrationStatus
}) {
  const [status, setStatus] = useState(initialStatus)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const pendingMigrations = useMemo(
    () =>
      status.databaseReachable
        ? status.migrations.filter((migration) => !migration.appliedAt)
        : [],
    [status.databaseReachable, status.migrations]
  )
  const hasPendingMigrations = pendingMigrations.length > 0
  const sourceNeedsUpdate = status.source.state !== 'current'
  const canRunMigrations =
    hasPendingMigrations &&
    status.configured &&
    status.databaseReachable &&
    !sourceNeedsUpdate

  const refreshStatus = async () => {
    setIsRefreshing(true)
    setMessage(null)
    try {
      setStatus(await getMigrationStatus())
    } catch {
      setMessage('Không thể kiểm tra trạng thái nâng cấp lúc này.')
    } finally {
      setIsRefreshing(false)
    }
  }

  const runMigrations = async () => {
    if (!canRunMigrations) return

    setIsRunning(true)
    setMessage(null)
    try {
      const result = await runPendingMigrations()
      setMessage(
        result.success
          ? result.message || 'Database đã được cập nhật.'
          : result.error || 'Không thể cập nhật database.'
      )
      setStatus(await getMigrationStatus())
    } catch {
      setMessage('Không thể cập nhật database. Vui lòng kiểm tra log server.')
    } finally {
      setIsRunning(false)
    }
  }

  const sourceStatusLabel =
    status.source.state === 'current'
      ? 'Source code đã được cập nhật'
      : status.source.state === 'outdated'
        ? 'Cần cập nhật source code trước khi tiếp tục'
        : 'Chưa thể kiểm tra version source code'

  return (
    <div className='space-y-5'>
      <section className='rounded-2xl border border-stone-200/60 bg-white/70 p-5 backdrop-blur-xl sm:p-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='flex items-start gap-3'>
            <div className='rounded-xl bg-amber-50 p-2.5 text-amber-700'>
              <ArrowUpCircle className='size-5' />
            </div>
            <div>
              <h2 className='font-serif text-xl font-semibold text-stone-900'>
                Kiểm tra và nâng cấp
              </h2>
              <p className='mt-1 max-w-2xl text-sm text-stone-500'>
                Kiểm tra source code và database trước khi áp dụng các thay đổi
                cần thiết.
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={refreshStatus}
            disabled={isRefreshing || isRunning}
            className='btn self-start whitespace-nowrap disabled:cursor-wait disabled:opacity-60'>
            <RefreshCw
              className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Kiểm tra lại
          </button>
        </div>
      </section>

      <div className='grid gap-4 md:grid-cols-2'>
        <section
          className={`rounded-2xl border p-5 ${
            status.source.state === 'current'
              ? 'border-emerald-200 bg-emerald-50/70'
              : 'border-amber-200 bg-amber-50/70'
          }`}>
          <div className='flex items-start gap-3'>
            {status.source.state === 'current' ? (
              <CheckCircle2 className='mt-0.5 size-5 shrink-0 text-emerald-700' />
            ) : (
              <AlertTriangle className='mt-0.5 size-5 shrink-0 text-amber-700' />
            )}
            <div className='min-w-0'>
              <p className='text-sm font-medium text-stone-600'>Source code</p>
              <h3 className='mt-1 text-base font-semibold text-stone-900'>
                {sourceStatusLabel}
              </h3>
              <p className='mt-2 text-sm text-stone-600'>
                Đang chạy:{' '}
                <span className='font-mono text-stone-800'>
                  {status.source.currentVersion || 'không xác định'}
                </span>{' '}
                · GitHub:{' '}
                <span className='font-mono text-stone-800'>
                  {status.source.latestVersion || 'không xác định'}
                </span>
              </p>
              {status.source.error && (
                <p className='mt-2 text-sm text-stone-600'>
                  {status.source.error}
                </p>
              )}
              {sourceNeedsUpdate && (
                <a
                  href={status.source.readmeUrl}
                  target='_blank'
                  rel='noreferrer'
                  className='mt-3 inline-flex text-sm font-medium text-stone-800 underline underline-offset-2 hover:text-amber-800'>
                  Xem hướng dẫn cập nhật source code
                </a>
              )}
            </div>
          </div>
        </section>

        <section
          className={`rounded-2xl border p-5 ${
            status.databaseReachable
              ? 'border-emerald-200 bg-emerald-50/70'
              : 'border-amber-200 bg-amber-50/70'
          }`}>
          <div className='flex items-start gap-3'>
            {status.databaseReachable ? (
              <CheckCircle2 className='mt-0.5 size-5 shrink-0 text-emerald-700' />
            ) : (
              <ServerCog className='mt-0.5 size-5 shrink-0 text-amber-700' />
            )}
            <div>
              <p className='text-sm font-medium text-stone-600'>Database</p>
              <h3 className='mt-1 text-base font-semibold text-stone-900'>
                {status.databaseReachable
                  ? 'Đã kết nối thành công'
                  : 'Chưa thể kết nối'}
              </h3>
              <p className='mt-2 text-sm text-stone-600'>
                {status.databaseReachable
                  ? 'Có thể kiểm tra và áp dụng thay đổi database.'
                  : status.configured
                    ? 'Kiểm tra lại kết nối database trên server.'
                    : 'Cần cấu hình SUPABASE_DB_URL trên server.'}
              </p>
            </div>
          </div>
        </section>
      </div>

      {message && (
        <div className='rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700'>
          {message}
        </div>
      )}

      {!status.databaseReachable ? (
        <section className='rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6'>
          <div className='flex items-start gap-3'>
            <AlertTriangle className='mt-0.5 size-5 shrink-0 text-amber-700' />
            <div>
              <h2 className='text-base font-semibold text-stone-900'>
                Chưa thể kiểm tra migration
              </h2>
              <p className='mt-1 text-sm text-stone-600'>
                {status.error ||
                  'Hãy cấu hình kết nối database rồi bấm “Kiểm tra lại”.'}
              </p>
              {!status.configured && (
                <a
                  href='/setup'
                  className='mt-3 inline-flex text-sm font-medium text-stone-800 underline underline-offset-2 hover:text-amber-800'>
                  Xem hướng dẫn cấu hình database
                </a>
              )}
            </div>
          </div>
        </section>
      ) : hasPendingMigrations ? (
        <section className='rounded-2xl border border-stone-200/60 bg-white/70 p-5 backdrop-blur-xl sm:p-6'>
          <div className='flex items-start gap-3'>
            <div className='rounded-xl bg-amber-50 p-2.5 text-amber-700'>
              <ArrowUpCircle className='size-5' />
            </div>
            <div>
              <h2 className='text-base font-semibold text-stone-900'>
                Có thay đổi cần áp dụng
              </h2>
              <p className='mt-1 text-sm text-stone-500'>
                {pendingMigrations.length} migration đang chờ được áp dụng. Các
                migration đã chạy được ẩn khỏi danh sách.
              </p>
            </div>
          </div>

          <div className='mt-5 divide-y divide-stone-100 rounded-xl border border-stone-200/80 bg-white/60'>
            {pendingMigrations.map((migration) => (
              <div
                key={migration.id}
                className='flex items-center justify-between gap-3 px-4 py-3'>
                <span className='min-w-0 truncate font-mono text-sm text-stone-600'>
                  {migration.file.split('/').pop()}
                </span>
                <span className='shrink-0 text-sm font-medium text-amber-700'>
                  Chưa chạy
                </span>
              </div>
            ))}
          </div>

          {sourceNeedsUpdate ? (
            <p className='mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'>
              Hãy cập nhật source code lên version mới nhất trước khi áp dụng
              các thay đổi database.
            </p>
          ) : (
            <button
              type='button'
              onClick={runMigrations}
              disabled={isRunning || isRefreshing}
              className='btn-primary mt-5 disabled:cursor-wait disabled:opacity-60'>
              {isRunning ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <ArrowUpCircle className='size-4' />
              )}
              {isRunning ? 'Đang nâng cấp...' : 'Áp dụng thay đổi'}
            </button>
          )}
        </section>
      ) : (
        <section className='rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6'>
          <div className='flex items-start gap-3'>
            <CheckCircle2 className='mt-0.5 size-5 shrink-0 text-emerald-700' />
            <div>
              <h2 className='text-base font-semibold text-stone-900'>
                Hệ thống đã được cập nhật
              </h2>
              <p className='mt-1 text-sm text-stone-600'>
                Source code và database đang đồng bộ. Hiện không có thay đổi nào
                cần áp dụng.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
