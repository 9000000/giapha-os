'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { toJpeg, toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import {
  AlertCircle,
  Download,
  FileImage,
  FileText,
  Loader2,
  X
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function ExportButton() {
  const [isExporting, setIsExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExport = async (format: 'png' | 'pdf') => {
    try {
      setIsExporting(true)
      setShowMenu(false)
      setError(null)

      // Add a small delay to allow UI to update (close menu) before capturing
      await new Promise((resolve) => setTimeout(resolve, 100))

      const element = document.getElementById('export-container')
      if (!element) throw new Error(t('exportError'))

      element.classList.add('exporting')

      const exportOptions = {
        cacheBust: true,
        backgroundColor: '#f5f5f4',
        pixelRatio: 2,
        width: element.scrollWidth,
        height: element.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: `${element.scrollWidth}px`,
          height: `${element.scrollHeight}px`
        }
      }

      if (format === 'png') {
        const url = await toPng(element, exportOptions)
        const a = document.createElement('a')
        a.href = url
        a.download = `giapha-sodo-${new Date().toISOString().split('T')[0]}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else if (format === 'pdf') {
        const imgData = await toJpeg(element, {
          ...exportOptions,
          quality: 0.95
        })

        // Get the actual width and height of the element to calculate PDF dimensions
        const width = element.scrollWidth
        const height = element.scrollHeight

        const pdf = new jsPDF({
          orientation: width > height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [width, height]
        })
        pdf.addImage(imgData, 'JPEG', 0, 0, width, height)
        pdf.save(`giapha-sodo-${new Date().toISOString().split('T')[0]}.pdf`)
      }
    } catch (err) {
      console.error('Export error:', err)
      setError(t('exportError'))
      setTimeout(() => setError(null), 5000)
    } finally {
      const element = document.getElementById('export-container')
      if (element) {
        element.classList.remove('exporting')
      }
      setIsExporting(false)
    }
  }

  return (
    <div className='relative' ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className={`flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
          showMenu
            ? 'border-amber-200 bg-amber-100/90 text-amber-800'
            : 'border-stone-200/60 bg-white/80 text-stone-600 backdrop-blur-md hover:bg-white hover:text-stone-900'
        }`}>
        {isExporting ? (
          <Loader2 className='size-4 shrink-0 animate-spin' />
        ) : (
          <Download className='size-4 shrink-0' />
        )}
        <span className='hidden min-w-max sm:inline'>
          {isExporting ? t('exporting') : t('exportFile')}
        </span>
      </button>

      <AnimatePresence>
        {showMenu && !isExporting && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className='absolute top-full right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-stone-200/60 bg-white/90 py-2 backdrop-blur-xl sm:right-auto sm:left-0'>
            <button
              onClick={() => handleExport('png')}
              className='flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-700'>
              <FileImage className='size-4' />
              {t('saveAsImage')}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className='flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-700'>
              <FileText className='size-4' />
              {t('saveAsPdf')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className='absolute top-full right-0 z-50 mt-2 flex w-64 flex-col gap-1 rounded-lg border border-red-200 bg-red-50 p-3'>
            <div className='flex items-start justify-between'>
              <div className='flex items-start gap-2'>
                <AlertCircle className='mt-0.5 h-4 w-4 shrink-0 text-red-500' />
                <span className='text-sm leading-snug font-medium text-red-800'>
                  {error}
                </span>
              </div>
              <button
                onClick={() => setError(null)}
                className='shrink-0 text-red-400 transition-colors hover:text-red-600'>
                <X className='h-4 w-4' />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
