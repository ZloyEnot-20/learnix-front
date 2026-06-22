export const PRIVACY_POLICY_LAST_UPDATED = "June 22, 2026"

export type PrivacySection = {
  title: string
  body: string
  bullets?: string[]
}

export const PRIVACY_POLICY_SECTIONS: PrivacySection[] = [
  {
    title: "Information We Collect",
    body:
      "Learnix collects information you provide when using our platform, as well as data generated through your learning activity.",
    bullets: [
      "Account details: name, email address, login username, password (stored as a secure hash), phone number (optional), and profile photo (optional).",
      "Academic data: homework submissions, test and entry-test results, exercise attempts, vocabulary progress, speaking audio recordings, listening activity, and gamification stats (level, tier, leaderboard rank).",
      "School context: organization, class/group membership, teacher assignments, and notes added by your school (where applicable).",
      "Device permissions (mobile app): microphone for speaking exercises and homework; photo library for choosing a profile avatar.",
      "Technical data: sign-in events, in-app analytics (exercise performance and duration), integrity signals during homework sessions, and audit logs for security and compliance.",
      "Guest sessions: limited temporary access without a full account; progress may not be saved permanently.",
      "Optional integrations: Telegram parent notifications when your school enables them (linked chat ID, username, or phone).",
    ],
  },
  {
    title: "How We Use Your Information",
    body: "We use your data to operate and improve the Learnix learning platform:",
    bullets: [
      "Deliver lessons, homework, tests, games, and vocabulary practice.",
      "Track progress, show achievements, and display leaderboards within your school.",
      "Let teachers and school administrators monitor academic activity and provide feedback.",
      "Evaluate speaking and writing submissions, including AI-assisted scoring where enabled.",
      "Send in-app notifications about homework, results, and school announcements.",
      "Maintain platform security, prevent cheating, and troubleshoot technical issues.",
      "Analyze aggregated usage to improve content and product quality.",
    ],
  },
  {
    title: "Data Storage & Security",
    body:
      "Data is transmitted over encrypted connections (HTTPS) and stored on our servers. Passwords are never stored in plain text. We apply reasonable administrative and technical safeguards, but no method of transmission or storage is completely secure.",
  },
  {
    title: "Data Retention",
    body:
      "We retain your information for as long as your account is active and as needed to provide the service. When you delete your account, your profile is deactivated and you can no longer sign in. Academic records (homework, test results, payments) may be retained by your school for educational, billing, or legal purposes even after account deactivation.",
  },
  {
    title: "Sharing & Third Parties",
    body: "We do not sell your personal data. Information may be shared only as described below:",
    bullets: [
      "Your school, teachers, and administrators associated with your account can view relevant academic activity.",
      "Service providers that help us host and operate the platform (e.g. cloud infrastructure) under contractual obligations to protect your data.",
      "Analytics: the Learnix website uses Vercel Analytics to collect anonymous page-view statistics. The mobile app sends learning analytics to our own backend.",
      "We may disclose information if required by law or to protect the rights and safety of users and the platform.",
    ],
  },
  {
    title: "Cookies & Local Storage",
    body:
      "The Learnix web application stores authentication tokens in your browser to keep you signed in. The mobile app stores similar tokens and optional offline caches (homework lists, profile snapshots) on your device. You can clear app cache from Profile → Settings in the mobile app.",
  },
  {
    title: "Your Rights",
    body: "Depending on your location, you may have the right to:",
    bullets: [
      "Access the personal data we hold about you.",
      "Request correction of inaccurate information.",
      "Request deletion or deactivation of your account (see below).",
      "Object to or restrict certain processing, where applicable by law.",
      "Withdraw consent where processing is based on consent.",
    ],
  },
  {
    title: "How to Delete Your Account",
    body:
      "Students can delete their own account directly in the Learnix mobile app. School staff accounts are managed by your organization.",
    bullets: [
      "Open the Learnix mobile app and sign in to your student account.",
      "Go to the Profile tab.",
      "Open Settings and tap Delete account.",
      "Confirm the action in both confirmation dialogs.",
      "Your account will be deactivated immediately. You will be signed out and will not be able to log in again with the same credentials.",
      "What happens: your profile is soft-deleted (marked as deactivated), you are removed from your class/group, and associated claims are cleared. Homework submissions, test results, and payment records may remain visible to your school administrators.",
      "If you cannot access the app, contact your teacher or school administrator to request account removal.",
      "Teachers and administrators: account deletion is handled by your school’s Learnix admin. Contact your organization owner or platform support.",
    ],
  },
  {
    title: "Children & Schools",
    body:
      "Learnix is designed for students learning English under the supervision of schools and educational institutions. Schools are responsible for obtaining any required parental or guardian consent before enrolling students.",
  },
  {
    title: "Changes to This Policy",
    body:
      "We may update this Privacy Policy from time to time. The “Last updated” date at the top of this page will reflect the latest version. Continued use of Learnix after changes are published means you accept the updated policy.",
  },
  {
    title: "Contact",
    body:
      "For privacy-related questions, data access requests, or account issues, contact your teacher or school administrator first. Organization administrators can reach Learnix platform support through their admin panel.",
  },
]
