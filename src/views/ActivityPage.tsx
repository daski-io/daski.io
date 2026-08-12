import { useEffect, useState } from 'react';
import { Section } from '../components/ui/Section';
import { SectionHead } from '../components/ui/SectionHead';
import { Caption, Mono } from '../components/ui/Mono';
import { Addr } from '../components/ui/Addr';
import {
  basescanAddress,
  getRailMetadata,
  shortAddress,
  type StandardRailMetadata,
} from '../lib/api';

export function ActivityPage({ initialMetadata = null }: { initialMetadata?: StandardRailMetadata | null }) {
  const [metadata, setMetadata] = useState(initialMetadata);

  useEffect(() => {
    const controller = new AbortController();
    getRailMetadata(controller.signal).then(setMetadata).catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <div>
      <Section pad="88px 32px 48px">
        <Caption style={{ marginBottom: 18 }}>rail status · testnet</Caption>
        <h1 style={{ fontSize: 56, margin: 0, color: 'var(--pro-text)', maxWidth: 900 }}>
          Public settlement facts, <span style={{ color: 'var(--mint-400)' }}>private order receipts.</span>
        </h1>
        <p style={{ color: 'var(--pro-text-dim)', fontSize: 17, lineHeight: 1.6, maxWidth: 760 }}>
          Standard x402 transfers remain visible on Base Sepolia. Daski does not publish a buyer-linked
          activity feed, request hashes, attachments, or confidential receipts.
        </p>
      </Section>

      <Section pad="32px 32px 0">
        <SectionHead kicker="active rail" title="Testnet configuration." />
        {metadata ? <div className="dk-grid-3">
          <Fact label="Network" value={metadata.paymentRail.network} />
          <Fact label="Scheme" value={`${metadata.paymentRail.scheme} · ${metadata.paymentRail.transferMethod}`} />
          <Fact label="Listed outcomes" value={metadata.outcomes.length.toString()} />
        </div> : <div className="dk-card" style={{ padding: 22 }}>
          <Caption>Configuration unavailable</Caption>
          <p style={{ color: 'var(--pro-text-dim)', marginBottom: 0 }}>
            Live rail metadata could not be verified. No fallback network or contract facts are shown.
          </p>
        </div>}
        <div className="dk-card" style={{ padding: 22, marginTop: 20 }}>
          <Row label="Canonical USDC" value={metadata?.paymentRail.asset} address />
          <Row label="Active rail profile" value={metadata?.paymentRail.activeRailProfileHash} />
        </div>
      </Section>

      <Section pad="48px 32px 0">
        <SectionHead
          kicker="immutable payment routes"
          title="One splitter per outcome epoch."
          subtitle="Each address splits the gross USDC payment directly between the provider and Daski. The facilitator is not part of the immutable financial route."
        />
        <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
          {metadata ? metadata.outcomes.map((outcome) => (
            <div key={`${outcome.providerAgentId}:${outcome.outcomeId}`} style={{ padding: 18, borderBottom: '1px solid var(--pro-border)' }}>
              <Mono mint>{outcome.outcomeId}</Mono>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, marginTop: 12 }}>
                <Caption>splitter</Caption>
                <Addr link={basescanAddress(outcome.payTo)}>{outcome.payTo}</Addr>
                <Caption>listing manifest</Caption>
                <Mono>{shortAddress(outcome.listingManifestHash, 16, 10)}</Mono>
              </div>
            </div>
          )) : <div style={{ padding: 18 }}><Caption>Verified outcome routes unavailable</Caption></div>}
        </div>
      </Section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="dk-card" style={{ padding: 22 }}><Caption>{label}</Caption><Mono style={{ display: 'block', marginTop: 10 }}>{value}</Mono></div>;
}

function Row({ label, value, address }: { label: string; value?: string; address?: boolean }) {
  const shown = value ?? 'not loaded';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 16, padding: '10px 0' }}>
      <Caption>{label}</Caption>
      {address && value ? <Addr link={basescanAddress(value)}>{value}</Addr> : <Mono style={{ overflowWrap: 'anywhere' }}>{shown}</Mono>}
    </div>
  );
}
