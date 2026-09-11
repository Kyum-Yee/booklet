# vendor — 오프라인 자산

`bash vendor/fetch.sh`를 실행하면 KaTeX 0.16.11을 `vendor/katex/`에 내려받는다.
받아두면 `index.html`이 CDN 대신 로컬 파일을 우선 사용해 인터넷 없이도 동작한다.
이미 받아둔 파일은 다시 받지 않으며, 네트워크가 없으면 오류만 안내하고 CDN 모드로 계속 쓸 수 있다.
`vendor/katex/`를 지우고 다시 실행하면 최신 상태로 재설치된다.
버전을 올리려면 `fetch.sh` 상단의 `VERSION` 값만 바꾸면 된다.
