import FamilyStats from '@/components/FamilyStats'
import { getSupabase } from '@/utils/supabase/queries'

export const metadata = {
  title: 'Thống kê gia phả'
}

export default async function StatsPage() {
  const supabase = await getSupabase()

  const { data: persons } = await supabase.from('persons').select('*')
  const { data: relationships } = await supabase
    .from('relationships')
    .select('*')

  return (
    <div className='relative flex w-full flex-1 flex-col pb-12'>
      <div className='relative z-20 mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8'>
        <h1 className='title'>Thống kê gia phả</h1>
        <p className='mt-1 text-sm text-stone-500'>
          Tổng quan số liệu về các thành viên trong dòng họ
        </p>
      </div>

      <main className='mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 lg:px-8'>
        <FamilyStats
          persons={persons ?? []}
          relationships={relationships ?? []}
        />
      </main>
    </div>
  )
}
