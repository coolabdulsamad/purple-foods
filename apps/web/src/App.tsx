import { Navigate, Route, Routes, useLocation } from 'react-router'
import { Toaster } from 'sonner'
import { StoreProvider, useStore } from './store'
import { BottomNav, DishArt, Marquee, TopBar } from './ui'
import {
  AccountPage,
  AddressesPage,
  CartPage,
  CategoryPage,
  CheckoutPage,
  EditProfilePage,
  FavoritesPage,
  HelpPage,
  HomePage,
  ItemDetailPage,
  LocationPage,
  NotificationsPage,
  OrderSuccessPage,
  OrderTrackingPage,
  OrdersPage,
  PromosPage,
  RestaurantPage,
  RestaurantsPage,
  SearchPage,
  SignInPage,
  SignUpPage,
  WelcomePage,
} from './pages'

/** Full-screen flow pages render without the top bar / bottom nav. */
const CHROMELESS = ['/welcome', '/location', '/auth', '/auth/signup', '/order-success']

/** First-run gate: onboarding (welcome → location → optional sign-in) comes
 *  before the storefront until the customer finishes or skips it. */
function OnboardingGate() {
  const { onboarded } = useStore()
  const loc = useLocation()
  const inFlow = CHROMELESS.some((p) => loc.pathname.startsWith(p))
  if (!onboarded && !inFlow) return <Navigate to="/welcome" replace />
  return null
}

function Shell() {
  const loc = useLocation()
  const chromeless = CHROMELESS.some((p) => loc.pathname.startsWith(p))
  return (
    <div className="relative min-h-dvh w-full max-w-[480px] bg-background shadow-2xl lg:my-6 lg:min-h-[calc(100dvh-3rem)] lg:rounded-[2rem] lg:overflow-hidden">
      {!chromeless && <TopBar />}
      <OnboardingGate />
      <main className={chromeless ? '' : 'pb-24'}>
        <Routes>
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/location" element={<LocationPage />} />
          <Route path="/auth" element={<SignInPage />} />
          <Route path="/auth/signup" element={<SignUpPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/r/:slug" element={<RestaurantPage />} />
          <Route path="/item/:id" element={<ItemDetailPage />} />
          <Route path="/category/:name" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success/:ref" element={<OrderSuccessPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:ref" element={<OrderTrackingPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/edit" element={<EditProfilePage />} />
          <Route path="/account/addresses" element={<AddressesPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/promos" element={<PromosPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!chromeless && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <div className="min-h-dvh bg-plum-deep lg:flex lg:items-center lg:justify-center lg:gap-10 lg:px-10">
        <aside aria-hidden="true" className="hidden max-w-xs shrink-0 text-lilac lg:sticky lg:top-20 lg:block lg:self-start">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-saffron">Purple Foods</p>
          <p className="mt-3 font-display text-5xl font-extrabold leading-[0.98] tracking-tight">
            Abuja,
            <br />
            served
            <br />
            <span className="text-saffron">hot.</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-lilac/70">
            Restaurants, grills, groceries and pharmacy — one governed platform. Customer, rider, merchant, admin.
          </p>
        </aside>
        <Shell />
        <aside aria-hidden="true" className="hidden w-56 shrink-0 lg:sticky lg:top-20 lg:block lg:self-start">
          <DishArt seed="desktop-garnish" className="w-full rounded-3xl" />
          <div className="mt-4 overflow-hidden rounded-2xl">
            <Marquee dark items={['Flame to doorstep', '12-min warmth SLA', 'Paystack · Flutterwave', 'Rider network live']} />
          </div>
        </aside>
      </div>
      <Toaster position="top-center" richColors />
    </StoreProvider>
  )
}
