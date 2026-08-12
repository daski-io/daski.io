import { Section } from '../components/ui/Section';
import { SectionHead } from '../components/ui/SectionHead';
import { Caption, Mono } from '../components/ui/Mono';
import { Addr } from '../components/ui/Addr';
import {
  basescanAddress,
  formatDuration,
  priceDisplay,
  shortAddress,
  type ServiceDetail,
} from '../lib/api';

export function ServiceDetailPage({ service }: { service: ServiceDetail }) {
  const rail = service.standardRail;
  const price = priceDisplay(service);
  const providerShare = 10_000 - rail.commissionBps;

  return (
    <div style={{ background: 'var(--pro-bg)' }}>
      <Section pad="24px 32px 0">
        <Caption><a href="/">outcomes</a> / {rail.outcomeId}</Caption>
      </Section>

      <Section pad="28px 32px 36px">
        <Mono mint>{rail.bindingProfile} · standard x402 v2</Mono>
        <h1 style={{ fontSize: 48, margin: '18px 0 14px', color: 'var(--pro-text)' }}>
          {service.name}
        </h1>
        <p style={{ maxWidth: 760, color: 'var(--pro-text-dim)', fontSize: 17, lineHeight: 1.6 }}>
          {service.serviceDescription}
        </p>
        <div className="dk-grid-3" style={{ marginTop: 28 }}>
          <Fact label="Price" value={`${price.value} ${price.unit}`} />
          <Fact label="Settlement" value="USDC · Exact-EVM" />
          <Fact label="Delivery deadline" value={`≤ ${formatDuration(rail.deadlinePolicy.fulfillmentSeconds)}`} />
        </div>
      </Section>

      <Section pad="12px 32px 0">
        <SectionHead
          kicker="before your agent signs"
          title="The payment route is fixed and inspectable."
          subtitle="The 402 challenge binds the outcome, amount, request, signed policies, and immutable splitter. Recipe-bound outcomes also commit that binding in the EIP-3009 nonce."
        />
        <div className="dk-card" style={{ padding: 22 }}>
          <Row label="Provider" value={service.legal.providerLegalName} />
          <Row label="Provider wallet" value={rail.providerPayee} link={basescanAddress(rail.providerPayee)} />
          <Row label="Outcome splitter" value={rail.payTo} link={basescanAddress(rail.payTo)} />
          <Row label="Provider share" value={`${(providerShare / 100).toFixed(2)}%`} />
          <Row label="Daski commission" value={`${(rail.commissionBps / 100).toFixed(2)}%`} />
          <Row label="Open-order capacity" value={rail.capacityPolicy.maxOpenOrders.toString()} />
          <Row label="Listing manifest" value={shortAddress(rail.listingManifestHash, 14, 10)} />
          <Row label="Provider offer" value={shortAddress(rail.providerOfferHash, 14, 10)} />
        </div>
      </Section>

      <Section pad="48px 32px 0">
        <SectionHead kicker="refund policy" title="Reserved before settlement." />
        <div className="dk-card" style={{ padding: 22 }}>
          <p style={{ color: 'var(--pro-text-dim)', lineHeight: 1.6, marginTop: 0 }}>
            Provider and Daski contributions are reserved before the facilitator is called.
            Buyer-requested refunds are {rail.refundPolicy.buyerRequested ? 'available' : 'not offered'}
            {rail.refundPolicy.buyerRequested
              ? ` for ${formatDuration(rail.refundPolicy.requestDeadlineSeconds)} after purchase.`
              : '.'}
          </p>
          {rail.bindingProfile === 'stock-fixed-v1' && (
            <p style={{ color: 'var(--pro-text-dim)', lineHeight: 1.6 }}>
              Replaying the identical signed authorization is a retry of the same purchase. A newly
              signed authorization is a separate purchase and is refundable only under this policy.
            </p>
          )}
          <Row label="Refund execution reserve" value={rail.refundPolicy.executionReserveAddress} link={basescanAddress(rail.refundPolicy.executionReserveAddress)} />
          <Row label="Refund evidence deadline" value={formatDuration(rail.deadlinePolicy.refundSeconds)} />
        </div>
      </Section>

      <Section pad="48px 32px 0">
        <SectionHead kicker="terms" title="Contracting parties and policies." />
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <a href={service.legal.providerTermsUrl}>Provider terms</a>
          <a href={service.legal.providerPrivacyUrl}>Provider privacy</a>
          <a href={service.legal.marketplaceTermsUrl}>Daski terms</a>
          <a href={service.legal.marketplacePrivacyUrl}>Daski privacy</a>
        </div>
      </Section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="dk-card" style={{ padding: 20 }}><Caption>{label}</Caption><Mono style={{ display: 'block', marginTop: 10 }}>{value}</Mono></div>;
}

function Row({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, padding: '11px 0', borderBottom: '1px solid var(--pro-border)' }}>
      <Caption>{label}</Caption>
      {link ? <Addr link={link}>{value}</Addr> : <Mono style={{ overflowWrap: 'anywhere' }}>{value}</Mono>}
    </div>
  );
}
