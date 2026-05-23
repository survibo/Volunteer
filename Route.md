# Route Structure

## Public Routes (비인증)
/                          # 랜딩 / 로그인 페이지
/auth/callback             # OAuth 콜백 처리 (Google / Kakao 공통)
/auth/register             # 최초 로그인 후 가입 정보 입력

## User Routes (준회원 + 회원 공통, 인증 필요)

### 봉사활동
/volunteer                 # 봉사활동 목록
/volunteer/:id             # 봉사활동 상세 + 신청

### 교육
/education                 # 교육 목록
/education/:id             # 교육 상세 + 신청

### 마이페이지
/mypage                    # 마이페이지 홈
/mypage/edit               # 마이페이지 수정
/mypage/volunteer          # 내 봉사활동 신청 내역
/mypage/education          # 내 교육 신청 내역
/mypage/withdraw           # 회원 탈퇴

### 활동 내역
/mylist          # 신청 & 과거 활동 내역


## Admin Routes (관리자 전용, /admin 하위)

### 회원 관리
/admin                     # 관리자 대시보드
/admin/members             # 회원 목록 (준회원 + 회원)
/admin/members/pending     # 준회원 승인 대기 목록
/admin/members/:id         # 회원 상세 + 승인 처리
/admin/members/withdrawn   # 탈퇴 회원 명단 조회

### 봉사활동 관리
/admin/volunteer           # 봉사활동 목록 (관리자 뷰)
/admin/volunteer/new       # 봉사활동 개설
/admin/volunteer/:id       # 봉사활동 상세
/admin/volunteer/edit/:id       # 봉사활동 수정 + 폐지
/admin/volunteer/:id/applications  # 신청 목록 + 수락/거절/취소 처리

### 교육 관리
/admin/education           # 교육 목록 (관리자 뷰)
/admin/education/new       # 교육 개설
/admin/education/:id       # 교육 상세
/admin/education/edit/:id  # 교육 수정 + 폐지
/admin/education/:id/applications  # 신청 목록 + 수락/거절/취소 처리

## Route Guards

### 인증 상태 단계 정의
# STEP 1. OAuth 인증 여부   → Supabase session 존재 여부
# STEP 2. 가입 정보 입력 여부 → DB users 테이블에 프로필 레코드 존재 여부
# STEP 3. 관리자 여부        → users.role = 'admin'

### Guard 규칙

# PUBLIC_ONLY
# 조건: STEP 1 통과 + STEP 2 완료 시 /volunteer 로 리다이렉트
  /
  /auth/callback

# REGISTER_ONLY
# 조건: STEP 1 미통과 시 / 로 리다이렉트
#       STEP 2 이미 완료 시 /volunteer 로 리다이렉트
  /auth/register

# AUTH_REQUIRED
# 조건: STEP 1 미통과 시 / 로 리다이렉트
#       STEP 2 미완료 시 /auth/register 로 리다이렉트
  /volunteer/*
  /education/*
  /mypage/*

# ADMIN_ONLY
# 조건: STEP 1 미통과 시 / 로 리다이렉트
#       STEP 2 미완료 시 /auth/register 로 리다이렉트
#       STEP 3 미통과 시 /volunteer 로 리다이렉트
  /admin/*

### 전체 리다이렉트 흐름 요약
OAuth 로그인
  └── /auth/callback
        ├── 신규 유저 (프로필 없음)  → /auth/register
        └── 기존 유저 (프로필 있음)
              ├── 관리자             → /admin
              └── 준회원/회원        → /volunteer