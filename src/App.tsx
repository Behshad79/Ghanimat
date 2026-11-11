import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './admin/shell/Shell'
import { Login } from './admin/Login'
import { Home, Live } from './admin/pages/Home'
import { Orders, OrderDetail } from './admin/pages/Orders'
import { ImportLink } from './admin/pages/Catalog'
import { Catalog, Labels, ProductDetail, Trash, UnitDetail } from './admin/catalog/Catalog'
import { ProductWizard } from './admin/catalog/Wizard'
import { Returns, Shipping, Warehouse } from './admin/pages/Ops'
import { PrintCenter } from './admin/print/PrintCenter'
import { Customers, Reviews, Support } from './admin/pages/People'
import { Channels, Finance, Pricing } from './admin/pages/Revenue'
import { AiCenter, Analytics, Branches, Content, Growth, Marketing, Sellers, Seo, Supply } from './admin/pages/Insights'
import { Design, Infra, Rules, Settings, Team } from './admin/pages/Org'
import { Simple } from './admin/simple/Simple'
import { Partner } from './admin/partner/Partner'
import { ConfirmHost, ToastHost } from './shared/ui/overlay'
import { currentUser, ROLES, useSession } from './shared/lib/store'

export function App() {
  const s = useSession()
  const me = currentUser()
  const face = me ? ROLES[s.viewAs ?? me.role].face : null
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        {!me ? <Route path="*" element={<Navigate to="/login" replace />} /> : (
          <>
            <Route path="/admin" element={face === 'full' ? <Shell /> : <Navigate to={face === 'simple' ? '/simple' : '/partner'} replace />}>
              <Route index element={<Home />} />
              <Route path="live" element={<Live />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="catalog/import" element={<ImportLink />} />
              <Route path="catalog/new" element={<ProductWizard />} />
              <Route path="catalog/:id/edit" element={<ProductWizard />} />
              <Route path="labels" element={<Labels />} />
              <Route path="trash" element={<Trash />} />
              <Route path="catalog/unit/:id" element={<UnitDetail />} />
              <Route path="catalog/:id" element={<ProductDetail />} />
              <Route path="supply" element={<Supply />} />
              <Route path="warehouse" element={<Warehouse />} />
              <Route path="shipping" element={<Shipping />} />
              <Route path="print" element={<PrintCenter />} />
              <Route path="returns" element={<Returns />} />
              <Route path="customers" element={<Customers />} />
              <Route path="support" element={<Support />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="channels" element={<Channels />} />
              <Route path="finance" element={<Finance />} />
              <Route path="content" element={<Content />} />
              <Route path="seo" element={<Seo />} />
              <Route path="marketing" element={<Marketing />} />
              <Route path="growth" element={<Growth />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="ai" element={<AiCenter />} />
              <Route path="branches" element={<Branches />} />
              <Route path="sellers" element={<Sellers />} />
              <Route path="team" element={<Team />} />
              <Route path="rules" element={<Rules />} />
              <Route path="settings" element={<Settings />} />
              <Route path="infra" element={<Infra />} />
              <Route path="design" element={<Design />} />
            </Route>
            <Route path="/simple" element={face === 'simple' ? <Simple /> : <Navigate to="/admin" replace />} />
            <Route path="/partner" element={face === 'partner' ? <Partner /> : <Navigate to="/admin" replace />} />
            <Route path="*" element={<Navigate to={ROLES[s.viewAs ?? me.role].home} replace />} />
          </>
        )}
      </Routes>
      <ToastHost />
      <ConfirmHost />
    </>
  )
}
