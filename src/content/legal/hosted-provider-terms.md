These Hosted Provider Terms ("Hosted Terms") govern Daski's Hosted Provider program, in which Daski hosts the technical side of a Provider's services on the Daski Platform through the Hosted Provider console at `providers.daski.io`, and for testing at `sandbox-providers.daski.io` (the "Console"). They are an agreement between Daski and the person or legal entity that uses the Console to offer services (the "Hosted Provider" or "you").

The [Daski Terms of Use](https://daski.io/terms-of-use) and the [Daski Privacy Policy](https://daski.io/privacy-policy) also apply. Terms defined in the Terms of Use have the same meaning here. If these Hosted Terms conflict with the Terms of Use about the Hosted Provider program, these Hosted Terms control.

## 1. The program and acceptance

The program is an invited beta. Daski admits Hosted Providers by invitation and at its discretion, and may decline, pause, or end an admission as these Hosted Terms allow.

You accept these Hosted Terms by confirming them in the Console or in writing to Daski, and in any case by publishing a service through the Console after they were presented to you. If you accept for a legal entity, you represent that you have authority to bind it, and "you" means that entity.

You must be at least 18 years old and legally able to contract, offer your services for business purposes, provide accurate information about yourself, and not be prohibited from the program by applicable law, including sanctions and export controls.

## 2. Your wallet and marketplace identity

You sign in to the Console with a wallet you control (your "Owner Wallet"). Your Owner Wallet owns your marketplace identity, receives your share of each payment, and signs the on-chain record that you completed an order. When you first sign in, Daski may create your marketplace identity and transfer it to your Owner Wallet at Daski's cost.

You are solely responsible for your Owner Wallet, its private key and recovery phrase, and every transaction it signs. Daski never asks for your private key, recovery phrase, or password and cannot recover a lost wallet or reverse a blockchain transaction.

The name you give in your profile is also your legal name on the marketplace. Keep your profile, your order email addresses, and your other details accurate and current.

## 3. The hosted key

As part of setup, you name a key that Daski operates and designates for the program (the "Hosted Key"; after a change under this Section, the new key) as your marketplace identity's agent wallet. You appoint Daski to use the Hosted Key for you and in your name, and only to:

- sign price quotes at the price of the listing you published;
- sign order status, questions, and completion messages that reflect your listing and your actions in the Console or by email;
- register and update the listings you publish and deploy their payment contracts;
- record an order as failed on chain when you decline it or when its deadline passes without a completion you signed; and
- carry out a change of the Hosted Key that you approve.

The Hosted Key cannot move your funds, change where you are paid, or transfer your identity. The Console never asks you to grant it those powers, and you must not grant them. Daski holds the Hosted Key so that it can sign only what this Section allows; on Base mainnet it is held by a key-custody provider under a policy that enforces those limits.

Messages and records signed with the Hosted Key under this Section are your statements to buyers and the marketplace. Daski is responsible to you for using the Hosted Key only as this Section allows.

Daski may change the Hosted Key, for example to move its custody. Daski will tell you what to sign and give you reasonable time. Until you switch, Daski may continue to act for you under the current key. After you switch, Daski may still use the earlier key to record the outcome of orders made under it.

If the Hosted Key is lost or misused, it could sign wrong messages or record wrong outcomes for orders made under it, although it cannot move money. Daski will tell you promptly and may ask you to record the outcome of your open orders with your Owner Wallet. You accept that risk during the beta.

You may end this appointment by naming as agent wallet a key that Daski has not designated. That ends Daski's hosting of your services under Section 12. Daski may still use the Hosted Key to record the outcome of orders that were made under it, as Section 6 describes.

## 4. Services and listings

You decide what you sell: each service's name, description, price, delivery estimate, the information buyers must supply, and the email address that receives its orders. Each service you publish is listed on the marketplace as your service, under your name.

You are solely responsible for your services and listings, including anything the Console assistant drafted, saved, or published for you. Review your services after using the assistant, and tell Daski promptly if it saved or published something you did not approve; Daski will help you correct it. They must be accurate and complete, describe what you can actually deliver, and comply with law. You must not list:

- unlawful, deceptive, or infringing services;
- services you are not licensed or otherwise permitted to provide;
- services that require buyers to supply passwords, private keys, recovery phrases, payment-card data, government identifiers, health information, or similar sensitive data through order fields or email; or
- services that the Terms of Use would prohibit an Operator from buying.

Daski may review, decline, pause, hide, or remove any service or listing, and may categorize services. You may pause sales of a service in the Console at any time; orders already paid continue.

An order is governed by the listing version and the legal links in effect when it was bought. Daski records your links but keeps no copies of the pages behind them, so keep your own records of each version.

## 5. Your terms and privacy notice

The contract for each service is between you and the buyer. Daski is not a party to it.

You may link your own terms and privacy notice. They must be lawful and available, must not conflict with these Hosted Terms, and may not reduce what Section 7 requires you to return to a buyer. Daski does not review them.

If you leave a link blank, the marketplace shows Daski's corresponding document in its place, and:

- for terms, the default terms for Hosted Provider Services in the Terms of Use govern your contract with each buyer, and you agree to them; and
- for privacy, you agree to the commitments in Section 9(c), which the Privacy Policy describes to buyers.

## 6. Orders and delivery

Each order reaches you by email from a per-order Daski address and in the Console. Daski acts on mail for an order only if it comes from the address you confirmed for that service. Keep that address working and check it.

You may ask the buyer questions by replying to the order email or in the Console. The buyer answers through the marketplace. You may continue a conversation elsewhere, but Daski does not follow it there, and you must still close the order in the Console.

Daski does not judge whether you delivered. Mark an order complete only after you have delivered what the listing promised, by writing a delivery note in the Console and signing the on-chain record with your Owner Wallet. You may send files with your reply mail or delivery note within the Console's limits.

An order stays open until you mark it complete or decline it, up to the deadline that applies to the listing version bought, counted from when the marketplace hands the paid order to the hosted service: 30 days for current listing versions, or the delivery time of an earlier version. The deadline runs even if an order email does not reach you. Daski sends reminders, but meeting the deadline is your responsibility. The Console stops accepting a completion shortly before the deadline so that the record can settle. If the deadline passes without a completion, the Hosted Key records the order as failed, and your marketplace record shows it.

The outcome recorded on chain is final and is the order's result.

## 7. Money

A buyer pays the price in USDC on Base into the listing's payment contract. When released, the contract sends your share to the service wallet you set, which must be your Owner Wallet, and Daski's commission to Daski. Daski does not hold your funds.

- **Commission.** The commission is the rate fixed in each listing's payment contract, currently 5% of the price. Daski may change the rate only for listing versions published at least 30 days after it tells you.
- **Listing fee.** Your wallet pays the on-chain listing fee when your services are activated. If your invitation says that Daski will refund it, Daski will send that amount from its own wallet after your first service is visible on the marketplace.
- **Network fees.** You pay the network fees for transactions your wallet sends.
- **Return after a failure.** If the outcome of a paid order is recorded on chain as failed, for example because you declined it or its deadline passed without a completion, you must return to the buyer's paying wallet the full share you received for that order, which is the price less Daski's commission (95% of the price at a 5% commission), in USDC on the same network, within 7 days after the failure is recorded. No return is due for an order recorded as completed, or for a failure that Daski confirms a misused Hosted Key recorded in error and that is corrected on chain. The Console shows the address and the amount. Daski's commission is not refunded. You may give the buyer more under your own terms.
- **Enforcement.** Each buyer of your services may enforce the return obligation directly against you. Daski does not make, fund, or guarantee returns, but may pause or remove your services, tell affected buyers, and end your participation if you do not make one.
- **Taxes.** You are responsible for taxes on your sales and for any invoices or records the law requires you to give buyers.
- **Promotions and reputation.** You must not buy your own services, or arrange purchases, to obtain cash back, reputation, or apparent demand.

## 8. The Console assistant

The Console includes an AI assistant that helps you set up your profile and services. It may draft or rewrite your listings. It is designed to ask for your confirmation before it saves anything and for your yes before it publishes. A new service is published only after you approve the transaction in your wallet; a change to a service already registered takes effect without a wallet step, once the assistant takes your message as a yes.

The assistant can be wrong. It does not give legal, tax, or financial advice, and you are responsible for checking what it saves and publishes for you (Section 4). Its use is subject to a monthly limit, and Daski may change or turn it off. You can always use the Console's Services and Profile pages instead.

Every message you write, each reply and intermediate step of the assistant, and the results of its actions are recorded, encrypted, and kept for twelve months, to operate and improve the Console and the assistant, as the Privacy Policy describes. Replies are generated by a third-party AI model provider. Never write private keys, recovery phrases, passwords, or payment-card data in the chat.

## 9. Data

**(a) Daski's own processing.** Daski processes your account, Console, and assistant data, and marketplace records, as a controller under its Privacy Policy.

**(b) Order content Daski hosts for you.** Daski processes the information buyers supply for your orders, order mail, questions, answers, delivery notes, and files to host your services: to receive, store, relay, display, and secure them, and to support you and your buyers. Daski will keep that content confidential, protect it with reasonable administrative, technical, and organizational safeguards, use the vendors its Privacy Policy describes, keep and delete it as the Privacy Policy's retention section describes (order mail copies are deleted 90 days after they are sent or received and files 90 days after the order ends, while the order record of the buyer's request, the order's messages, and the delivery note is kept as the order's history), tell you without undue delay after it becomes aware of a security incident affecting it, and reasonably help you respond to requests from individuals about it. Where applicable law treats Daski as your processor or service provider for that content, Daski will process it only on your instructions as expressed in these Hosted Terms and your use of the Console, unless the law requires otherwise. Daski also uses order content as a controller for the marketplace purposes its Privacy Policy describes, such as security, fraud prevention, disputes, and legal compliance.

**(c) Your processing.** You receive buyer information to perform your services and are responsible for your own use of it under applicable law. If you have not linked your own privacy notice, you must use that information only to perform, support, and keep records of the order and to meet your legal obligations; keep it secure; not sell it or use it for advertising or unrelated marketing; delete it when no longer needed; and respond to an individual's request about it or forward the request to Daski.

**(d) Your records.** Daski deletes order mail copies and files after the periods above. Keep your own copies of anything you need for longer.

## 10. Daski's role and acceptable use

Daski operates the marketplace and hosts your services. It is not a party to your contracts with buyers, does not supervise or control how you perform your services, and is not your employer, partner, or agent, except for the limited appointment in Section 3.

You must comply with applicable law, including licensing, consumer-protection, tax, data-protection, export-control, and sanctions law, and with the acceptable-use rules of the Terms of Use. You must not use the Console or order mail to send spam or malware, access another Provider's data, interfere with the Console or the marketplace, misuse the assistant, impersonate anyone, or manipulate reputation, marketplace discovery, apparent demand, or promotions.

Daski may investigate suspected breaches and may pause, hide, or remove your services or suspend your access when reasonably necessary for security, legal compliance, platform integrity, or the protection of buyers or others.

## 11. Beta and changes

The program is a beta. Features, limits, and availability may change, and no service levels apply. Daski may pause the program, and quotes for your services may be refused while it is unavailable.

Daski may update these Hosted Terms by posting a revised version and effective date at `https://daski.io/hosted-provider-terms` and telling you by email at least 14 days before a material change takes effect, except for changes required by law or needed to address security or abuse. Changes do not alter orders already paid. If you continue to use the Console or offer services after a change takes effect, you accept it. If you do not agree, stop as Section 12 describes.

## 12. Ending

You may stop at any time: pause your services and ask Daski at the contact address below to close your participation.

Daski may suspend or end your participation, or a service, for breach of these Hosted Terms or the Terms of Use, risk to buyers or others, failure to return money under Section 7, a legal or security requirement, or prolonged inactivity. Daski may also end the program or your participation for any other reason with at least 30 days' notice.

When your participation ends, your services stop taking new orders. You must still deliver, or decline and return money for, every open order. Daski will keep hosting open orders until their outcomes are recorded where practicable. Your marketplace identity and wallet remain yours. Daski keeps or deletes data under its retention practices and legal obligations.

Sections 3 (as to orders made under the Hosted Key), 7, 9, 13, 14, and 15 survive.

## 13. Disclaimers and limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE CONSOLE, THE HOSTING, THE ASSISTANT, AND THE PROGRAM ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, INCLUDING WARRANTIES THAT YOUR SERVICES WILL SELL AND WARRANTIES OF AVAILABILITY, ACCURACY, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

TO THE MAXIMUM EXTENT PERMITTED BY LAW, DASKI AND ITS AFFILIATES, DIRECTORS, OFFICERS, EMPLOYEES, CONTRACTORS, AND LICENSORS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES, OR LOST PROFITS, REVENUE, BUSINESS, DATA, GOODWILL, OR DIGITAL ASSETS. THEIR TOTAL AGGREGATE LIABILITY ARISING FROM THESE HOSTED TERMS OR THE PROGRAM WILL NOT EXCEED THE GREATER OF (A) THE COMMISSIONS DASKI RECEIVED FROM YOUR ORDERS DURING THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO LIABILITY OR (B) US$100.

These exclusions and limits do not apply to fraud, willful misconduct, or liability that cannot lawfully be excluded or limited.

## 14. Indemnification

You will defend, indemnify, and hold harmless Daski and its affiliates, directors, officers, employees, contractors, and licensors from third-party claims, including claims by buyers and authorities, and from the resulting damages, penalties, losses, and reasonable costs, arising from your services, listings, deliveries, terms and privacy notice, handling of buyer information, failure to return money under Section 7, taxes, breach of these Hosted Terms, or violation of law or another person's rights.

Daski will give you reasonable notice of a claim and may control its defense with counsel of its choice. You may not settle a claim in a way that admits Daski's fault or imposes obligations on Daski without Daski's written consent.

## 15. General

Section 20 of the Terms of Use (governing law and disputes) applies to these Hosted Terms, with Wyoming law and the courts it names, and with notices under it sent as this Section describes.

Daski may send notices to an email address you confirmed for your services, or in the Console. Send notices to Daski at the contact address below.

Daski may assign these Hosted Terms in connection with a merger, reorganization, sale of assets, or transfer to an affiliate. You may not assign them without Daski's consent.

These Hosted Terms, the Terms of Use, the Privacy Policy, and any written terms in your invitation are the entire agreement about the program. Failure to enforce a provision is not a waiver. If a provision is unenforceable, it will be enforced to the maximum lawful extent and the remainder will remain effective. Neither party is liable for delay caused by events beyond its reasonable control, except that this does not excuse an obligation to return money under Section 7.

The parties are independent contractors. Except for buyers' right to enforce Section 7, these Hosted Terms create no rights for third parties.

## 16. Contact

All support, legal, privacy, and security communications may be sent to `support@daski.io`.
