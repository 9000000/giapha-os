import UpgradeManager from '@/components/UpgradeManager'
import { getMigrationStatus } from '@/app/actions/migrations'
import { getProfile } from '@/utils/supabase/queries'
import { redirect } from 'next/navigation'

export default async function UpgradePage() {
  const profile = await getProfile()

  if (profile?.role !== 'admin' || !profile.is_active) {
    redirect('/dashboard')
  }

  const migrationStatus = await getMigrationStatus()

  return (
    <main className='relative flex w-full flex-1 flex-col overflow-auto bg-stone-50/50 pt-8'>
      <div className='relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8'>
        <div className='mb-8 flex flex-col items-start justify-between sm:flex-row sm:items-center'>
          <div>
            <h1 className='title'>Nâng cấp hệ thống</h1>
            <p className='mt-2 max-w-2xl text-sm text-stone-500 sm:text-sm'>
              Kiểm tra source code và database trước khi áp dụng các thay đổi
              cần thiết. Công cụ này chỉ dành cho quản trị viên.
            </p>
          </div>
        </div>

        <UpgradeManager initialStatus={migrationStatus} />
      </div>
    </main>
  )
}
