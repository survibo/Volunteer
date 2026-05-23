import ActivityList from '../components/ActivityList'

export default function EducationPage({ profile }) {
  return (
    <ActivityList
      table="educations"
      sectionLabel="교육"
      pageTitle="교육"
      createLabel="새 교육"
      createPath="/admin/education/new"
      profile={profile}
    />
  )
}
