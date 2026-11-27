import { Navigate, Route, Routes, useLocation } from 'react-router'
import { Toaster } from 'sonner'
import { StoreProvider } from './store'
import { Assistant } from './components/Assistant'
import { BottomNav, Footer, TopBar } from './ui'
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
  PaymentsPage,
  PromosPage,
  RestaurantPage,
  RestaurantsPage,
  SearchPage,
  SignInPage,
  SignUpPage,
  TransactionsPage,
  WelcomePage,
} from './pages'

/** Full-screen flow pages render without the header / footer / bottom nav. */
const CHROMELESS = ['/welcome', '/location', '/auth', '/auth/signup', '/order-success']

// NOTE: there is deliberately no first-run gate. This is a website, not an
// install-prompt app: guests land on the storefront Home page immediately,
// can browse everything, pick their area from the top bar, and only sign in
// if they want to (buttons in the top bar and on the Home hero).

function Shell() {
  const loc = useLocation()
  const chromeless = CHROMELESS.some((p) => loc.pathname.startsWith(p))
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {!chromeless && <TopBar />}
      {/* min-h keeps the footer below the fold on short pages — it only
          appears after scrolling, never floating mid-screen. */}
      <main
        className={
          chromeless
            ? 'flex-1'
            : 'min-h-[calc(100dvh-3.5rem)] flex-1 pb-24 md:min-h-[calc(100dvh-4rem)] md:pb-0'
        }
      >
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
          <Route path="/account/payments" element={<PaymentsPage />} />
          <Route path="/account/transactions" element={<TransactionsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/promos" element={<PromosPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!chromeless && <Footer />}
      {!chromeless && <BottomNav />}
      {!chromeless && <Assistant />}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
      <Toaster position="top-center" richColors />
    </StoreProvider>
  )
}
