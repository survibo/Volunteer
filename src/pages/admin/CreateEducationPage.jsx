import ActivityForm from '../../components/ActivityForm'

export default function CreateEducationPage({ profile }) {
  return (
    <ActivityForm
      table="educations"
      redirectTo="/education"
      sectionLabel="교육"
      pageTitle="새 교육 개설"
      profile={profile}
    />
  )
}
