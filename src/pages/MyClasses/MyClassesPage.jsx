import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/Common/PageHeader.jsx'
import { SearchBar } from '../../components/Common/SearchBar.jsx'
import { MyClassesCards } from '../../components/MyClasses/MyClassesCards.jsx'
import { MyClassesDetail } from '../../components/MyClasses/MyClassesDetail.jsx'
import { MyClassesTabs } from '../../components/MyClasses/MyClassesTabs.jsx'
import { myClasses } from '../../datas/myClasses.js'
import { myClassTabs } from '../../datas/myClassTabs.js'

export const MyClassesPage = () => {
  const [selectedId, setSelectedId] = useState(myClasses[0].id)
  const [activeTab, setActiveTab] = useState(myClassTabs[0])
  const selectedClass = useMemo(
    () => myClasses.find((item) => item.id === selectedId) || myClasses[0],
    [selectedId],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lớp học của tôi"
        description="Module giáo viên sử dụng nhiều nhất: xem lớp, học viên, homework, tiến độ và điểm danh bằng QR hoặc thủ công."
      />
      <SearchBar placeholder="Tìm lớp: IELTS Foundation 01, Elementary Kids, Speaking Club, TOEIC 550..." />
      <MyClassesCards selectedId={selectedId} onSelect={setSelectedId} />
      <MyClassesTabs activeTab={activeTab} onChange={setActiveTab} />
      <MyClassesDetail key={selectedClass.id} selectedClass={selectedClass} activeTab={activeTab} />
    </div>
  )
}
