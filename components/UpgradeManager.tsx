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
  RefreshCw
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

  const pendingCount = useMemo(
    () => status.migrations.filter((migration) => !migration.appliedAt).length,
    [status.migrations]
  )
  const sourceNeedsUpdate = status.source.state !== 'current'

  const refreshStatus = async () => {
    setIsRefreshing(true)
    setMessage(null)
    try {
      setStatus(await getMigrationStatus())
    } finally {
      setIsRefreshing(false)
    }
  }

  const runMigrations = async () => {
    if (
      pendingCount === 0 ||
      !status.configured ||
      !status.databaseReachable ||
      sourceNeedsUpdate
    )
      return
    setIsRunning(true)
    setMessage(null)
    try {
      const result = await runPendingMigrations()
      setMessage(
        result.success
          ? result.message || 'Database đã ở phiên bản mới nhất.'
          : result.error || 'Không thể chạy migration.'
      )
      setStatus(await getMigrationStatus())
    } catch {
      setMessage('Không thể chạy migration. Vui lòng kiểm tra log server.')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <section className='rounded-2xl border border-stone-200/60 bg-white/70 p-5 backdrop-blur-xl sm:p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex items-start gap-3'>
          <div className='rounded-xl bg-amber-50 p-2.5 text-amber-700'>
            <ArrowUpCircle className='size-5' />
          </div>
          <div>
            <h2 className='font-serif text-xl font-semibold text-stone-900'>
              Nâng cấp hệ thống
            </h2>
            <p className='mt-1 text-sm text-stone-500'>
              Kiểm tra version source code, database và chạy migration còn
              thiếu.
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

      <div className='mt-5 flex flex-wrap items-center gap-2 text-sm'>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium ${
            status.databaseReachable
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-amber-200 bg-amber-50 text-amber-800'
          }`}>
          {status.databaseReachable ? (
            <CheckCircle2 className='size-3.5' />
          ) : (
            <AlertTriangle className='size-3.5' />
          )}
          {status.databaseReachable ? 'Đã kết nối database' : 'Chưa sẵn sàng'}
        </span>
        <span className='text-stone-500'>
          {pendingCount > 0
            ? `${pendingCount} migration chưa chạy`
            : 'Database đã ở phiên bản mới nhất'}
        </span>
      </div>

      <div
        className={`mt-4 rounded-xl border p-4 text-sm ${
          status.source.state === 'current'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
        <div className='flex items-start gap-2.5'>
          {status.source.state === 'current' ? (
            <CheckCircle2 className='mt-0.5 size-4 shrink-0' />
          ) : (
            <AlertTriangle className='mt-0.5 size-4 shrink-0' />
          )}
          <div className='min-w-0'>
            <p className='font-medium'>
              {status.source.state === 'current'
                ? 'Source code không cũ hơn version trên GitHub'
                : status.source.state === 'outdated'
                  ? 'Cần cập nhật source code trước khi chạy migration'
                  : 'Chưa thể xác minh version source code'}
            </p>
            <p className='mt-1 break-words'>
              Hiện tại:{' '}
              <span className='font-mono'>
                {status.source.currentVersion || 'không xác định'}
              </span>{' '}
              · GitHub:{' '}
              <span className='font-mono'>
                {status.source.latestVersion || 'không xác định'}
              </span>
            </p>
            {status.source.error && (
              <p className='mt-1'>{status.source.error}</p>
            )}
            {sourceNeedsUpdate && (
              <a
                href={status.source.readmeUrl}
                target='_blank'
                rel='noreferrer'
                className='mt-2 inline-flex font-medium underline underline-offset-2 hover:text-stone-900'>
                Xem hướng dẫn cập nhật source code trong README.md
              </a>
            )}
          </div>
        </div>
      </div>

      {status.error && (
        <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
          {status.error}
        </div>
      )}

      {message && (
        <div className='mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700'>
          {message}
        </div>
      )}

      <div className='mt-5 divide-y divide-stone-100 rounded-xl border border-stone-200/80 bg-white/60'>
        {status.migrations.map((migration) => (
          <div
            key={migration.id}
            className='flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
            <span className='font-mono text-sm text-stone-600'>
              {migration.file.split('/').pop()}
            </span>
            <span
              className={`text-sm font-medium ${
                migration.appliedAt ? 'text-emerald-700' : 'text-amber-700'
              }`}>
              {migration.appliedAt
                ? `Đã chạy · ${new Date(migration.appliedAt).toLocaleString('vi-VN')}`
                : 'Chưa chạy'}
            </span>
          </div>
        ))}
      </div>

      <button
        type='button'
        onClick={runMigrations}
        disabled={
          isRunning ||
          isRefreshing ||
          pendingCount === 0 ||
          !status.configured ||
          !status.databaseReachable ||
          sourceNeedsUpdate
        }
        className='btn-primary mt-5 disabled:cursor-not-allowed disabled:opacity-60'>
        {isRunning ? (
          <Loader2 className='size-4 animate-spin' />
        ) : (
          <ArrowUpCircle className='size-4' />
        )}
        {isRunning ? 'Đang cập nhật...' : 'Chạy migration còn thiếu'}
      </button>
    </section>
  )
}
