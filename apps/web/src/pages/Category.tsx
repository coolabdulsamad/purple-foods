import { Link, useParams } from 'react-router'
import { Store } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { ErrorBlock, LoadingBlock, MerchantCard, PageHero } from '../ui'

export default function CategoryPage() {
  const { name } = useParams()
  const tag = decodeURIComponent(name ?? '')
  const restaurantsQuery = trpc.catalog.restaurants.useQuery()
  const matches = (restaurantsQuery.data ?? []).filter((r) => r.tags.includes(tag))

  return (
    <div className="pb-8">
      <PageHero icon={Store} title={tag} sub={`${matches.length} spots`} />
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
      {restaurantsQuery.isLoading ? (
        <LoadingBlock label="Loading…" />
      ) : restaurantsQuery.isError ? (
        <ErrorBlock message="Could not load this category." onRetry={() => restaurantsQuery.refetch()} />
      ) : matches.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
          <Store className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-plum">No {tag} spots yet</p>
          <Link to="/restaurants" className="mt-3 inline-block rounded-full bg-plum px-4 py-2 text-xs font-bold text-lilac active:scale-95">
            Browse all restaurants
          </Link>
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((r) => (
            <li key={r.id}>
              <MerchantCard r={r} />
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  )
}
