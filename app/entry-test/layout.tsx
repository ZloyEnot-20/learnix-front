import { EntryTestLangProvider } from "@/components/entry-test/entry-test-lang"

export default function EntryTestLayout({ children }: { children: React.ReactNode }) {
  return <EntryTestLangProvider>{children}</EntryTestLangProvider>
}
