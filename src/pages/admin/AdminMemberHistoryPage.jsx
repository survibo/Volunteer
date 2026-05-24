import { useParams, Link } from 'react-router'
import { useMember } from '../../hooks/useMembers'
import MyHistoryPage from '../mypage/MyHistoryPage'
import TopLoadingBar from '../../components/TopLoadingBar'

export default function AdminMemberHistoryPage() {
  const { id } = useParams()
  const { data: member, isLoading } = useMember(id)

  return (
    <section className="grid gap-5 sm:gap-6">
      <Link
        className="inline-block text-xs font-semibold uppercase tracking-wider text-action-default hover:underline"
        to={`/admin/members/${id}`}
      >
        회원 상세
      </Link>
      {isLoading ? (
        <TopLoadingBar />
      ) : member ? (
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          {member.name}
          <span className="ml-2 text-lg font-normal text-text-tertiary">활동 내역</span>
        </h1>
      ) : null}
      <MyHistoryPage memberId={id} hideHeader />
    </section>
  )
}
