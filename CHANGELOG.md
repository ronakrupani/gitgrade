# Changelog

## 1.0.0

First release.

Type a GitHub username and get every public repo on the account scored out
of 100 against thirteen repo hygiene rules, an overall letter grade, and
the repos ranked worst to best with the exact fix for every failed check.

What is in it:

- Thirteen checks, one file each, with tests. The release check loads
  after first paint and only when the rate limit can spare it.
- Not applicable checks drop out of the denominator, so a library is not
  marked down for having no deployed URL.
- Account grade as a plain average, with the one fix worth the most and
  the three patterns costing the account the most points.
- Every check row expands to say why it matters and what to do.
- Sort four ways, filter by grade, hide forks.
- Responses cached in the browser for an hour, so a second look at the
  same account costs no requests. Stale entries are served when the
  limit is used up.
- Rate limit status in the header, and an optional field for your own
  token, stored only in your browser and sent only to api.github.com.
- Shareable URLs. A page opened from a link scans straight away.
- Archived repos are left out entirely.

Read only. No login, no backend, nothing is ever written to your repos.
