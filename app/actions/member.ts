'use server'

import { getProfile, getSupabase } from '@/utils/supabase/queries'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function deleteMemberProfile(memberId: string) {
  if (!UUID_PATTERN.test(memberId)) {
    return { error: 'Hồ sơ không hợp lệ.' }
  }

  const profile = await getProfile()
  const supabase = await getSupabase()

  if (
    !profile?.is_active ||
    (profile.role !== 'admin' && profile.role !== 'editor')
  ) {
    return {
      error: 'Từ chối truy cập. Chỉ Admin hoặc Editor mới có quyền xoá hồ sơ.'
    }
  }

  // 2. Check for existing relationships
  const { data: relationships, error: relationshipError } = await supabase
    .from('relationships')
    .select('id')
    .or(`person_a.eq.${memberId},person_b.eq.${memberId}`)
    .limit(1)

  if (relationshipError) {
    console.error('Error checking relationships:', relationshipError)
    return { error: 'Lỗi kiểm tra mối quan hệ gia đình.' }
  }

  if (relationships && relationships.length > 0) {
    return {
      error:
        'Không thể xoá. Vui lòng xoá hết các mối quan hệ gia đình của người này trước.'
    }
  }

  // 3. Delete the member
  const { error: deleteError } = await supabase
    .from('persons')
    .delete()
    .eq('id', memberId)

  if (deleteError) {
    console.error('Error deleting person:', deleteError)
    return { error: 'Đã xảy ra lỗi khi xoá hồ sơ.' }
  }

  // 4. Revalidate and redirect
  revalidatePath('/dashboard/members')
  redirect('/dashboard/members')
}

export async function updateDescendantGenerationsAction(
  personId: string,
  generationDelta: number
) {
  if (!UUID_PATTERN.test(personId)) {
    return { error: 'Hồ sơ không hợp lệ.' }
  }

  if (
    generationDelta === 0 ||
    !Number.isInteger(generationDelta) ||
    Math.abs(generationDelta) > 100
  ) {
    return generationDelta === 0
      ? { success: true }
      : { error: 'Giá trị thay đổi thế hệ không hợp lệ.' }
  }

  const profile = await getProfile()
  const supabase = await getSupabase()

  if (
    !profile?.is_active ||
    (profile.role !== 'admin' && profile.role !== 'editor')
  ) {
    return {
      error: 'Từ chối truy cập. Chỉ Admin hoặc Editor mới có quyền chỉnh sửa.'
    }
  }

  // 1. Fetch all parent-child relationships
  const { data: relationships, error: relError } = await supabase
    .from('relationships')
    .select('person_a, person_b, type')
    .in('type', ['biological_child', 'adopted_child'])

  if (relError) {
    console.error('Error fetching relationships:', relError)
    return { error: 'Lỗi lấy danh sách quan hệ' }
  }

  // Build children map (person_a is parent, person_b is child)
  const childrenMap = new Map<string, string[]>()
  relationships.forEach((r) => {
    if (!childrenMap.has(r.person_a)) childrenMap.set(r.person_a, [])
    childrenMap.get(r.person_a)!.push(r.person_b)
  })

  // 2. Find all descendants using BFS
  const descendants = new Set<string>()
  const queue = [personId]
  while (queue.length > 0) {
    const current = queue.shift()!
    const children = childrenMap.get(current) || []
    for (const child of children) {
      if (!descendants.has(child)) {
        descendants.add(child)
        queue.push(child)
      }
    }
  }

  if (descendants.size === 0) return { success: true }
  const descendantIds = Array.from(descendants)

  // 3. Fetch current generations of descendants
  const { data: persons, error: personsError } = await supabase
    .from('persons')
    .select('id, generation')
    .in('id', descendantIds)

  if (personsError) {
    console.error('Error fetching persons:', personsError)
    return { error: 'Lỗi lấy thông tin thế hệ' }
  }

  // 4. Update each descendant's generation
  let hasError = false
  // Batch processing can be done by looping
  for (const person of persons) {
    if (person.generation !== null && person.generation !== undefined) {
      const newGen = Math.max(1, person.generation + generationDelta)
      const { error: updateError } = await supabase
        .from('persons')
        .update({ generation: newGen })
        .eq('id', person.id)

      if (updateError) {
        console.error(`Error updating person ${person.id}:`, updateError)
        hasError = true
      }
    }
  }

  if (hasError) {
    return { error: 'Có lỗi xảy ra khi cập nhật một số thế hệ sau' }
  }

  return { success: true }
}
