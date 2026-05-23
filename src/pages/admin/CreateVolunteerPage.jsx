import ActivityForm from '../../components/ActivityForm'

export default function CreateVolunteerPage({ profile }) {
  return (
    <ActivityForm
      table="volunteer_activities"
      redirectTo="/volunteer"
      sectionLabel="봉사활동"
      pageTitle="새 봉사활동 개설"
      profile={profile}
    />
  )
}
