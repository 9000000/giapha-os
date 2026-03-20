import { NextResponse } from 'next/server';
import { getSupabase } from '@/utils/supabase/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getSupabase();
  const { data: persons } = await supabase.from('persons').select('*');
  const { data: relationships } = await supabase.from('relationships').select('*');
  
  return NextResponse.json({
    personsCount: persons?.length || 0,
    persons,
    relationshipsCount: relationships?.length || 0,
    relationships
  });
}
