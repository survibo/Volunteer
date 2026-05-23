import ActivityList from '../components/ActivityList'

export default function VolunteerPage({ profile }) {
  return (
    <ActivityList
      table="volunteer_activities"
      sectionLabel="봉사활동"
      pageTitle="봉사활동"
      createLabel="새 봉사활동"
      createPath="/admin/volunteer/new"
      profile={profile}
    />
  )
}
