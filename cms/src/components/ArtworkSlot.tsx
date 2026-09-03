import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface ArtworkSpec {
  aspect: string
  px: string
  maxKB: number
}

interface Props {
  showId?: string
  episodeId?: string
  artworkType: 'poster' | 'banner' | 'thumbnail'
  spec: ArtworkSpec
  current?: any
}

export default function ArtworkSlot({ showId, episodeId, artworkType, spec, current }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [preview, setPreview] = useState<string | null>(null)
  const [previewDims, setPreviewDims] = useState<{ w: number; h: number } | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('artwork_type', artworkType)
      if (showId) fd.append('show_id', showId)
      if (episodeId) fd.append('episode_id', episodeId)
      return api.uploadArtwork(fd)
    },
    onSuccess: () => {
      setErrors([])
      setPreview(null)
      setPreviewDims(null)
      if (showId) queryClient.invalidateQueries({ queryKey: ['show', showId] })
      if (episodeId) queryClient.invalidateQueries({ queryKey: ['episodes'] })
    },
    onError: (err) => {
      setErrors([(err as Error).message])
    },
  })

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Pre-flight: read dimensions so editor can see what they're uploading
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setPreviewDims({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.src = url
    setPreview(url)
    setErrors([])
    upload.mutate(file)
  }

  const hasImage = !!(preview || current)
  const imageUrl =
    preview ||
    (current ? `${import.meta.env.VITE_API_URL || ''}/media/${current.storage_key}` : null)

  return (
    <div
      className={`artwork-slot ${hasImage ? 'has-image' : ''} ${errors.length > 0 ? 'has-error' : ''}`}
      onClick={() => fileRef.current?.click()}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={artworkType} className={artworkType} />
      ) : (
        <div
          style={{
            aspectRatio: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-muted)',
          }}
        >
          {upload.isPending ? 'Uploading...' : '+ Upload'}
        </div>
      )}
      <div className="artwork-slot-label">{artworkType.toUpperCase()}</div>
      <div className="artwork-slot-spec">
        {spec.aspect} · {spec.px} · max {spec.maxKB}KB
      </div>
      {previewDims && upload.isPending && (
        <div className="artwork-slot-preview-info">
          Detected: {previewDims.w}×{previewDims.h}px
        </div>
      )}
      {errors.map((err, i) => (
        <div key={i} className="form-error" style={{ marginTop: 6 }}>
          {err}
        </div>
      ))}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={onSelect}
      />
    </div>
  )
}
