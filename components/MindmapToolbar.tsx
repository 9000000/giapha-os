import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import BaseToolbar, { type BaseToolbarProps } from './BaseToolbar'

interface MindmapToolbarProps extends BaseToolbarProps {
  setExpandSignal: (val: { type: 'expand' | 'collapse'; ts: number }) => void
}

export default function MindmapToolbar({
  setExpandSignal,
  ...baseProps
}: MindmapToolbarProps) {
  return (
    <BaseToolbar {...baseProps}>
      {/* Expand/Collapse Controls */}
      <div className='flex h-10 items-center overflow-hidden rounded-full border border-stone-200/60 bg-white/80 shadow-sm backdrop-blur-md transition-opacity'>
        <button
          onClick={() => setExpandSignal({ type: 'collapse', ts: Date.now() })}
          className='flex h-full items-center gap-1.5 px-3 font-medium text-stone-600 transition-colors hover:bg-stone-100/50 md:px-4'
          title='Thu gọn tất cả'>
          <ChevronsDownUp className='size-4' />
          <span className='hidden text-xs sm:inline sm:text-sm'>Thu gọn</span>
        </button>
        <button
          onClick={() => setExpandSignal({ type: 'expand', ts: Date.now() })}
          className='flex h-full items-center gap-1.5 border-r border-stone-200/50 px-3 font-medium text-stone-600 transition-colors hover:bg-stone-100/50 md:px-4'
          title='Mở rộng tất cả'>
          <ChevronsUpDown className='size-4' />
          <span className='hidden text-xs sm:inline sm:text-sm'>Mở rộng</span>
        </button>
      </div>
    </BaseToolbar>
  )
}
