import { Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import { StoreProvider } from './store'
import { BottomNav, DishArt, Marquee, TopBar } from './ui'
import { AccountPage, CartPage, CheckoutPage, HomePage, OrdersPage, RestaurantPage } from './pages'

export default function App() {
  return (
    <StoreProvider>
      <div className="min-h-dvh bg-plum-deep lg:flex lg:items-center lg:justify-center lg:gap-10 lg:px-10">
        <aside aria-hidden="true" className="hidden max-w-xs shrink-0 text-lilac lg:sticky lg:top-20 lg:block lg:self-start">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-saffron">Purple Foods</p>
          <p className="mt-3 font-display text-5xl font-extrabold leading-[0.98] tracking-tight">
            Lagos,
            <br />
            served
            <br />
            <span className="text-saffron">hot.</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-lilac/70">
            Restaurants, grills, groceries and pharmacy — one governed platform. Customer, rider, merchant, admin.
          </p>
        </aside>
        <div className="relative min-h-dvh w-full max-w-[480px] bg-background shadow-2xl lg:my-6 lg:min-h-[calc(100dvh-3rem)] lg:rounded-[2rem] lg:overflow-hidden">
          <TopBar />
          <main className="pb-24">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/r/:id" element={<RestaurantPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
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
