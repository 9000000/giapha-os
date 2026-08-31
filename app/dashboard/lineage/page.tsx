import LineageManager from '@/components/LineageManager'
import { getProfile, getSupabase } from '@/utils/supabase/queries'
import { redirect } from 'next/navigation'

export default async function LineagePage() {
  const profile = await getProfile()

  if (profile?.role !== 'admin' || !profile.is_active) {
    redirect('/dashboard')
  }

  const supabase = await getSupabase()

  const { data: personsData } = await supabase
    .from('persons')
    .select('*')
    .order('birth_year', { ascending: true, nullsFirst: false })

  const { data: relsData } = await supabase.from('relationships').select('*')

  // Identify "roots" - people with no parents
  const persons = personsData || []
  const relationships = relsData || []

  return (
    <main className='relative flex w-full flex-1 flex-col overflow-auto bg-stone-50/50 pt-8'>
      <div className='relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='title'>Thứ tự gia phả</h1>
          <p className='mt-2 max-w-2xl text-sm text-stone-500 sm:text-sm'>
            Tự động tính toán và cập nhật{' '}
            <strong className='text-stone-700'>thế hệ</strong>,{' '}
            <strong className='text-stone-700'>thứ tự sinh</strong> và{' '}
            <strong className='text-stone-700'>trạng thái Dâu/Rể</strong> cho
            tất cả thành viên. Xem preview trước khi áp dụng.
          </p>
        </div>

        {/* Info cards */}
        <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div className='rounded-2xl border border-stone-200/60 bg-white/80 p-5'>
            <div className='flex items-start gap-3'>
              <span className='text-sm'>🌳</span>
              <div>
                <h3 className='mb-1 text-base font-semibold text-stone-800'>
                  Thế hệ (Generation)
                </h3>
                <p className='text-sm leading-relaxed text-stone-500'>
                  Dùng thuật toán BFS từ các tổ tiên gốc (người chưa có thông
                  tin bố/mẹ trong hệ thống). Tổ tiên = Đời 1, con = Đời 2, cháu
                  = Đời 3... Con dâu/rể kế thừa đời của người bạn đời.
                </p>
              </div>
            </div>
          </div>
          <div className='flex flex-col gap-4 rounded-2xl border border-stone-200/60 bg-white/80 p-5'>
            <div className='flex items-start gap-3'>
              <span className='text-sm'>👶</span>
              <div>
                <h3 className='mb-1 text-base font-semibold text-stone-800'>
                  Thứ tự sinh (Birth Order)
                </h3>
                <p className='text-sm leading-relaxed text-stone-500'>
                  Trong danh sách anh/chị/em cùng cha, sắp xếp theo năm sinh
                  tăng dần và gán số thứ tự 1, 2, 3... Con dâu/rể không được
                  tính thứ tự.
                </p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <span className='text-sm'>💍</span>
              <div>
                <h3 className='mb-1 text-base font-semibold text-stone-800'>
                  Dâu / Rể (In-Law Status)
                </h3>
                <p className='text-sm leading-relaxed text-stone-500'>
                  Tự động xác định là dâu/rể nếu thành viên có vợ/chồng trong hệ
                  thống nhưng không có thông tin bố/mẹ. Giúp hiển thị đúng thẻ
                  phân loại ngoài danh sách.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Manager */}
        <div className='rounded-2xl border border-stone-200/60 bg-white/80 p-5 sm:p-8'>
          <LineageManager persons={persons} relationships={relationships} />
        </div>
      </div>
    </main>
  )
}
