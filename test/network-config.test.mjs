import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAINS, DEFAULT_TESTNET_GATEWAY_URL } from '../src/lib/chains.ts';
import { gatewayTarget, networkView, resolveNetworkConfig } from '../src/lib/network.ts';

test('a service with no variables is the testnet sandbox site', () => {
  const config = resolveNetworkConfig({});

  assert.equal(config.id, 'testnet');
  assert.equal(config.label, 'Testnet');
  assert.equal(config.chainId, 84532);
  assert.equal(config.chainName, 'Base Sepolia');
  assert.equal(config.explorerUrl, 'https://sepolia.basescan.org');
  assert.equal(config.gatewayUrl, DEFAULT_TESTNET_GATEWAY_URL);
  assert.equal(config.gatewayInternalUrl, null);
  assert.equal(config.notice, 'testnet');
  assert.equal(config.siteUrl, 'https://sandbox.daski.io');
  assert.deepEqual(config.siteUrls, {
    testnet: 'https://sandbox.daski.io',
    mainnet: 'https://daski.io',
  });
  assert.equal(config.robots, 'index');
  assert.deepEqual(gatewayTarget(config), {
    url: DEFAULT_TESTNET_GATEWAY_URL,
    internalUrl: null,
    chainId: 84532,
  });
});

test('mainnet without a gateway is the launching-soon state, not an error', () => {
  const config = resolveNetworkConfig({ DASKI_NETWORK: 'mainnet' });

  assert.equal(config.id, 'mainnet');
  assert.equal(config.label, 'Mainnet');
  assert.equal(config.chainId, 8453);
  assert.equal(config.chainName, 'Base');
  assert.equal(config.explorerUrl, 'https://basescan.org');
  assert.equal(config.gatewayUrl, null);
  assert.equal(config.gatewayInternalUrl, null);
  assert.equal(config.notice, 'mainnet-soon');
  assert.equal(config.siteUrl, 'https://daski.io');
  assert.equal(gatewayTarget(config), null);
});

test('mainnet with a gateway is live and carries the private origin', () => {
  const config = resolveNetworkConfig({
    DASKI_NETWORK: 'mainnet',
    GATEWAY_URL: 'https://gateway.daski.io/',
    GATEWAY_INTERNAL_URL: 'http://gateway.railway.internal:8080',
  });

  assert.equal(config.gatewayUrl, 'https://gateway.daski.io');
  assert.equal(config.gatewayInternalUrl, 'http://gateway.railway.internal:8080');
  assert.equal(config.notice, 'none');
  assert.deepEqual(gatewayTarget(config), {
    url: 'https://gateway.daski.io',
    internalUrl: 'http://gateway.railway.internal:8080',
    chainId: 8453,
  });
});

test('the internal origin is ignored while no public gateway exists', () => {
  const config = resolveNetworkConfig({
    DASKI_NETWORK: 'mainnet',
    GATEWAY_INTERNAL_URL: 'http://gateway.railway.internal:8080',
  });

  assert.equal(config.gatewayUrl, null);
  assert.equal(config.gatewayInternalUrl, null);
});

test('overrides replace the derived values', () => {
  const config = resolveNetworkConfig({
    NETWORK_NOTICE: 'none',
    SITE_URL: 'https://preview.example',
    MAINNET_SITE_URL: 'https://mainnet.example',
    EXPLORER_URL: 'https://explorer.example',
    SITE_ROBOTS: 'noindex',
  });

  assert.equal(config.notice, 'none');
  assert.equal(config.siteUrl, 'https://preview.example');
  assert.deepEqual(config.siteUrls, {
    testnet: 'https://preview.example',
    mainnet: 'https://mainnet.example',
  });
  assert.equal(config.explorerUrl, 'https://explorer.example');
  assert.equal(config.robots, 'noindex');
});

test('blank variables count as unset', () => {
  const config = resolveNetworkConfig({ DASKI_NETWORK: '  ', GATEWAY_URL: '', NETWORK_NOTICE: '' });

  assert.equal(config.id, 'testnet');
  assert.equal(config.gatewayUrl, DEFAULT_TESTNET_GATEWAY_URL);
  assert.equal(config.notice, 'testnet');
});

test('typos fail loudly instead of quietly serving another network', () => {
  assert.throws(
    () => resolveNetworkConfig({ DASKI_NETWORK: 'mainet' }),
    /DASKI_NETWORK must be one of testnet, mainnet, got "mainet"/,
  );
  assert.throws(
    () => resolveNetworkConfig({ NETWORK_NOTICE: 'soon' }),
    /NETWORK_NOTICE must be one of testnet, mainnet-soon, none/,
  );
  assert.throws(
    () => resolveNetworkConfig({ SITE_ROBOTS: 'no' }),
    /SITE_ROBOTS must be one of index, noindex/,
  );
  assert.throws(
    () => resolveNetworkConfig({ GATEWAY_URL: 'sandbox-gateway.daski.io' }),
    /GATEWAY_URL must be an absolute URL/,
  );
  assert.throws(
    () => resolveNetworkConfig({ GATEWAY_URL: 'https://gateway.daski.io/mcp' }),
    /GATEWAY_URL must be a bare origin/,
  );
  assert.throws(
    () => resolveNetworkConfig({ GATEWAY_URL: 'https://user:secret@gateway.daski.io' }),
    /GATEWAY_URL must be a bare origin/,
  );
  assert.throws(
    () => resolveNetworkConfig({ GATEWAY_INTERNAL_URL: 'ftp://gateway.railway.internal' }),
    /GATEWAY_INTERNAL_URL must be a bare origin/,
  );
  assert.throws(
    () => resolveNetworkConfig({ SITE_URL: 'https://daski.io/?utm=1' }),
    /SITE_URL must be a bare origin/,
  );
});

test('the island view is the serializable slice of the config', () => {
  const config = resolveNetworkConfig({ GATEWAY_INTERNAL_URL: 'http://gateway.railway.internal:8080' });
  const view = networkView(config);

  assert.deepEqual(Object.keys(view).sort(), [
    'chainId', 'chainName', 'explorerUrl', 'gatewayUrl', 'id', 'label', 'notice', 'siteUrls',
  ]);
  assert.equal('gatewayInternalUrl' in view, false);
  assert.equal(JSON.parse(JSON.stringify(view)).gatewayUrl, DEFAULT_TESTNET_GATEWAY_URL);
});

test('chain facts are the protocol constants the gateway and buyer use', () => {
  assert.equal(CHAINS.testnet.chainId, 84532);
  assert.equal(CHAINS.testnet.network, 'base-sepolia');
  assert.equal(CHAINS.mainnet.chainId, 8453);
  assert.equal(CHAINS.mainnet.network, 'base');
});
