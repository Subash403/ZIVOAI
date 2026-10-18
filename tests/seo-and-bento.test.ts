import test from 'node:test';
import assert from 'node:assert/strict';
import robots from '../src/app/robots';
import sitemap from '../src/app/sitemap';

test('SEO, Robots Privacy & Sitemap Routing', async (t) => {
  await t.test('robots configuration strictly disallows indexing of private paths', () => {
    const robotsConfig = robots();
    assert.ok(robotsConfig.rules);
    const rule = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules;
    const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];

    assert.ok(disallow.includes('/admin'));
    assert.ok(disallow.includes('/admin/*'));
    assert.ok(disallow.includes('/account'));
    assert.ok(disallow.includes('/account/*'));
    assert.ok(disallow.includes('/checkout'));
    assert.ok(disallow.includes('/checkout/*'));
    assert.ok(disallow.includes('/api/*'));
  });

  await t.test('robots configuration explicitly allows public storefront routes', () => {
    const robotsConfig = robots();
    const rule = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules;
    const allow = Array.isArray(rule.allow) ? rule.allow : [rule.allow];

    assert.ok(allow.includes('/'));
    assert.ok(allow.includes('/projects'));
    assert.ok(allow.includes('/projects/*'));
    assert.ok(allow.includes('/policies'));
  });

  await t.test('sitemap generates valid canonical URLs for static marketing routes', async () => {
    const sitemapEntries = await sitemap();
    assert.ok(Array.isArray(sitemapEntries));
    assert.ok(sitemapEntries.length >= 4);

    const urls = sitemapEntries.map((e) => e.url);
    const hasHome = urls.some((u) => u === 'https://zivo.ai' || u.endsWith('/'));
    const hasProjects = urls.some((u) => u.includes('/projects'));
    const hasCustom = urls.some((u) => u.includes('/projects/custom'));

    assert.ok(hasHome, 'Sitemap should contain home URL');
    assert.ok(hasProjects, 'Sitemap should contain /projects');
    assert.ok(hasCustom, 'Sitemap should contain /projects/custom');
  });
});
