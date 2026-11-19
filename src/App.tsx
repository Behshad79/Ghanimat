import { Blog } from './admin/blog/Blog'
import { ArticleEditor } from './admin/blog/ArticleEditor'
import { Readiness } from './admin/catalog/Readiness'
import { People, PersonFile } from './admin/people/People'
import { Vault } from './admin/people/Vault'
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
import { ReasonHost } from './shared/ui/reason'
import { QuickHost } from './shared/ui/quickview'
import { Customer360 } from './admin/customer/Customer360'
import { Builder } from './admin/builder/Builder'
import { Integrations } from './admin/pro/Integrations'
import { Promotions } from './admin/pro/Promotions'
import { SiteEditor } from './admin/site/SiteEditor'
import { CustomerRequests } from './admin/cx/Requests'
import { Social } from './admin/social/Social'
import { Conversations } from './admin/cx/Conversations'
import { CxSettingsPage } from './admin/cx/CxSettings'
import { AiCenter, Analytics, Branches, Content, Growth, Marketing, Sellers, Seo, Supply } from './admin/pages/Insights'
import { Design, Infra, Rules, Settings, Team } from './admin/pages/Org'
import { Simple } from './admin/simple/Simple'
import { ReturnCase, WarrantyCase } from './admin/returns/Case'
import { ReviewWidget } from './shared/ui/review'
import { Agents } from './admin/agents/Agents'
import { Partner } from './admin/partner/Partner'
import { Insight } from './admin/insight/Insight'
import { Merch } from './admin/merch/Merch'
import { Network } from './admin/partner/Network'
import { NotFound } from './admin/shell/NotFound'
import { PartnersAdmin } from './admin/partner/PartnersAdmin'
import { Messaging } from './admin/cx/Messaging'
import { Calls } from './admin/cx/Calls'
import { Remote } from './admin/cx/Remote'
import { ConfirmHost, ToastHost } from './shared/ui/overlay'
import { currentUser, ROLES, useSession } from './shared/lib/store'
import { MediaPage } from './admin/media/Media'
import { TradePage } from './admin/trade/Trade'

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
              <Route path="blog" element={<Blog />} />
              <Route path="blog/:id" element={<ArticleEditor />} />
              <Route path="readiness" element={<Readiness />} />
              <Route path="catalog/import" element={<ImportLink />} />
              <Route path="catalog/new" element={<ProductWizard />} />
              <Route path="catalog/:id/edit" element={<ProductWizard />} />
              <Route path="labels" element={<Labels />} />
              <Route path="trash" element={<Trash />} />
              <Route path="catalog/unit/:id" element={<UnitDetail />} />
              <Route path="catalog/:id" element={<ProductDetail />} />
              <Route path="supply" element={<Supply />} />
              <Route path="insight/:key" element={<Insight />} />
              <Route path="merch" element={<Merch />} />
              <Route path="network" element={<Network />} />
              <Route path="*" element={<NotFound />} />
              <Route path="warehouse" element={<Warehouse />} />
              <Route path="shipping" element={<Shipping />} />
              <Route path="print" element={<PrintCenter />} />
              <Route path="returns" element={<Returns />} />
              <Route path="agents" element={<Agents />} />
              <Route path="media" element={<MediaPage />} />
              <Route path="trade" element={<TradePage />} />
              <Route path="returns/w/:id" element={<WarrantyCase />} />
              <Route path="returns/:id" element={<ReturnCase />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<Customer360 />} />
              <Route path="support" element={<Support />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="channels" element={<Channels />} />
              <Route path="finance" element={<Finance />} />
              <Route path="content" element={<Content />} />
              <Route path="site" element={<SiteEditor />} />
              <Route path="builder" element={<Builder />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="promotions" element={<Promotions />} />
              <Route path="requests" element={<CustomerRequests />} />
              <Route path="social" element={<Social />} />
              <Route path="conversations" element={<Conversations />} />
              <Route path="experience" element={<CxSettingsPage />} />
              <Route path="seo" element={<Seo />} />
              <Route path="marketing" element={<Marketing />} />
              <Route path="growth" element={<Growth />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="ai" element={<AiCenter />} />
              <Route path="branches" element={<Branches />} />
              <Route path="sellers" element={<PartnersAdmin />} />
              <Route path="messaging" element={<Messaging />} />
              <Route path="calls" element={<Calls />} />
              <Route path="remote" element={<Remote />} />
              <Route path="team" element={<Team />} />
              <Route path="people" element={<People />} />
              <Route path="vault" element={<Vault />} />
              <Route path="people/:id" element={<PersonFile />} />
              <Route path="rules" element={<Rules />} />
              <Route path="settings" element={<Settings />} />
              <Route path="infra" element={<Infra />} />
              <Route path="design" element={<Design />} />
            </Route>
            <Route path="/simple" element={face === 'simple' || (!s.viewAs && ['super', 'ops'].includes(me.role)) ? <Simple /> : <Navigate to="/admin" replace />} />
            <Route path="/partner" element={face === 'partner' ? <Partner /> : <Navigate to="/admin" replace />} />
            <Route path="*" element={<Navigate to={ROLES[s.viewAs ?? me.role].home} replace />} />
          </>
        )}
      </Routes>
      <ToastHost />
      <ConfirmHost />
      <ReasonHost />
      <QuickHost />
      {import.meta.env.VITE_REVIEW !== 'off' && <ReviewWidget />}
    </>
  )
}
