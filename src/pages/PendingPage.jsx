import { useState } from "react";

export default function PendingPage({ profile }) {
  const [copied, setCopied] = useState(false);

  const ACCOUNT_NUMBER = "하나은행 576-910005-80704";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(ACCOUNT_NUMBER);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <section className="grid gap-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">
        가입비 납부
      </p>
      <h1 className="max-w-3xl text-3xl font-bold leading-tight text-text-primary md:text-5xl">
        {profile.name}님, <br />등록이 완료되었습니다.
      </h1>
      <p className="max-w-2xl text-sm text-text-secondary">
        가입비 확인 후 관리자가 회원번호를 부여합니다.
      </p>
      <p className="text-sm text-text-secondary">
        아래 계좌로 가입비를 입금해 주세요.
      </p>
      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={handleCopy}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover md:w-auto"
        >
          {copied ? "복사됨" : ACCOUNT_NUMBER}
        </button>
      </div>
    </section>
  );
}
