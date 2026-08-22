'use client'

import { Person } from '@/types'
import { getAvatarBg } from '@/utils/styleHelprs'
import Image from 'next/image'
import { useMemberListView } from '@/context/MemberListContext'
import DefaultAvatar from './DefaultAvatar'

interface FamilyNodeCardProps {
  person: Person
  role?: string // e.g., "Chồng", "Vợ"
  note?: string | null
  onClickCard?: () => void
  onClickName?: (e: React.MouseEvent) => void
  isRingVisible?: boolean
  isPlusVisible?: boolean
  level: number
}

export default function FamilyNodeCard({
  person,
  onClickCard,
  onClickName,
  isRingVisible = false,
  isPlusVisible = false
}: FamilyNodeCardProps) {
  const { showAvatar, setMemberModalId } = useMemberListView()

  const isDeceased = person.is_deceased

  const content = (
    <div
      onClick={onClickCard}
      className={`group relative flex h-full flex-col items-center justify-start rounded-3xl px-1 py-2 transition-all duration-300 hover:-translate-y-1 ${isDeceased ? 'opacity-80 grayscale-[0.4]' : ''} ${showAvatar ? 'w-20 bg-surface/70 backdrop-blur-xl hover:shadow-soft-hover sm:w-24 md:w-28' : 'px-3'} `}>
      {isRingVisible && (
        <div
          className={`absolute top-[15%] -left-2.5 z-100 flex size-5 items-center justify-center rounded-full text-[10px] font-medium text-stone-500 sm:-left-3.5 sm:size-6 sm:text-sm ${showAvatar ? 'bg-white shadow-sm' : ''} `}>
          <span className='leading-none'>💍</span>
        </div>
      )}
      {isPlusVisible && (
        <div
          className={`absolute top-[15%] -left-2.5 z-100 flex size-5 items-center justify-center rounded-full text-[10px] font-medium text-stone-500 sm:-left-3.5 sm:size-6 sm:text-sm ${showAvatar ? 'bg-white shadow-sm' : ''} `}>
          <span className='leading-none'>+</span>
        </div>
      )}

      {/* 1. Avatar */}
      {showAvatar && (
        <div className='relative z-10 mb-1.5 sm:mb-2'>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] text-white shadow-lg ring-2 ring-white transition-transform duration-300 group-hover:scale-105 sm:h-12 sm:w-12 sm:text-xs md:h-14 md:w-14 md:text-sm ${getAvatarBg(person.gender)} `}>
            {person.avatar_url ? (
              <Image
                unoptimized
                src={person.avatar_url}
                alt={person.full_name}
                className='h-full w-full object-cover'
                width={64}
                height={64}
              />
            ) : (
              <DefaultAvatar gender={person.gender} size={64} />
            )}
          </div>
        </div>
      )}

      {/* 2. Gender Icon + Name */}
      <div className='relative z-10 flex w-full flex-col items-center justify-center gap-1 px-0.5 sm:px-1'>
        <div
          className={`cursor-pointer text-center text-[10px] leading-tight font-bold transition-colors sm:text-[11px] md:text-xs ${onClickName ? 'text-stone-800 group-hover:text-amber-700 hover:underline' : 'text-stone-800 group-hover:text-amber-800'} `}
          title={person.full_name}
          onClick={(e) => {
            if (onClickName) {
              e.stopPropagation()
              e.preventDefault()
              onClickName(e)
            }
          }}>
          {showAvatar
            ? person.full_name
            : person.full_name.split(' ').map((word, i) => (
                <span key={i} className='block'>
                  {word}
                </span>
              ))}
        </div>
      </div>
    </div>
  )

  if (onClickCard || onClickName) {
    return content
  }

  return (
    <button onClick={() => setMemberModalId(person.id)} className='block w-fit'>
      {content}
    </button>
  )
}
