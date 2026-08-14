import { useEffect, useState } from 'react'
import { Download, Eye, EyeOff, FileText, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { classMaterials } from '../../datas/myClassExtras.js'
import { Badge } from '../Common/Badge.jsx'
import { Button } from '../Common/Button.jsx'
import { Card } from '../Common/Card.jsx'

export const MyClassesMaterials = ({ selectedSession }) => {
  const sessionMaterials = selectedSession?.materials || classMaterials
  const [materials, setMaterials] = useState(sessionMaterials)

  useEffect(() => {
    setMaterials(sessionMaterials)
  }, [sessionMaterials])

  const updateMaterial = (id, field, value) => {
    setMaterials((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const handleShare = (material) => {
    updateMaterial(material.id, 'shared', true)
    toast.success('Đã chia sẻ tài liệu', {
      description: material.title,
    })
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {materials.map((material) => (
        <Card key={material.id}>
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-700">
              <FileText size={22} />
            </span>
            <Badge tone={material.visibility === 'Hiện' ? 'green' : 'slate'}>{material.visibility}</Badge>
          </div>
          <h3 className="mt-4 text-lg font-black text-slate-950">{material.title}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{material.type}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="min-h-9 px-3" variant="secondary" onClick={() => handleShare(material)}>
              <Share2 size={16} />
              Chia sẻ
            </Button>
            <Button className="min-h-9 px-3" variant="secondary" onClick={() => updateMaterial(material.id, 'visibility', material.visibility === 'Hiện' ? 'Ẩn' : 'Hiện')}>
              {material.visibility === 'Hiện' ? <EyeOff size={16} /> : <Eye size={16} />}
              {material.visibility === 'Hiện' ? 'Ẩn' : 'Hiện'}
            </Button>
            <Button className="min-h-9 px-3" variant="secondary" onClick={() => updateMaterial(material.id, 'access', material.access === 'Cho tải' ? 'Chỉ xem' : 'Cho tải')}>
              <Download size={16} />
              {material.access}
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2 text-sm">
            <span className="font-bold text-slate-600">Quyền</span>
            <Badge tone="orange">{material.access}</Badge>
          </div>
        </Card>
      ))}
    </div>
  )
}
