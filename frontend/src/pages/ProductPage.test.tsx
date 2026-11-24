import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getProduct, submitEnquiry } from '../api/catalogue.ts';
import { ApiError } from '../api/client.ts';
import { mockApiDefaults } from '../test/mockApi.ts';
import { renderApp } from '../test/renderApp.tsx';
import type { EnquiryAccepted, Product } from '../types/index.ts';

vi.mock('../api/catalogue.ts');
const mockedGetProduct = vi.mocked(getProduct);
const mockedSubmit = vi.mocked(submitEnquiry);

const backpack: Product = {
  id: 1,
  title: 'Fjallraven Backpack',
  description: 'Your perfect pack for everyday use.',
  category: "men's clothing",
  price: 109.95,
  imageUrl: 'https://images.example.test/1.png',
  rating: { rate: 3.9, count: 120 },
};

beforeEach(() => {
  mockApiDefaults();
  mockedGetProduct.mockResolvedValue(backpack);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const main = () => screen.getByRole('main');
const field = (label: RegExp) => within(main()).getByLabelText(label);

async function openEnquiry() {
  renderApp('/products/1');
  await userEvent.click(await within(main()).findByRole('button', { name: 'Enquire' }));
}

async function fillValid() {
  await userEvent.type(field(/^Name/), '  Ann Lee ');
  await userEvent.type(field(/^Email/), 'ann@example.test');
}

describe('ProductPage details', () => {
  it('shows image, title, category link, price, rating and description', async () => {
    renderApp('/products/1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Fjallraven Backpack' })).toBeTruthy();
    expect(within(main()).getByRole('img', { name: 'Fjallraven Backpack' })).toBeTruthy();
    expect(within(main()).getByRole('link', { name: "Men's clothing" }).getAttribute('href')).toBe("/categories/men's%20clothing");
    expect(within(main()).getByText('$109.95')).toBeTruthy();
    expect(within(main()).getByText('Rated 3.9 out of 5 from 120 ratings')).toBeTruthy();
    expect(within(main()).getByText('Your perfect pack for everyday use.')).toBeTruthy();
    expect(document.title).toBe('Fjallraven Backpack | Product Catalogue');
    expect(mockedGetProduct).toHaveBeenCalledWith(1, expect.any(AbortSignal));
  });

  it.each(['abc', '0', '-1', '1.5', '1e3', '9999999999'])('treats id %j as not found without calling the API', (id) => {
    renderApp(`/products/${id}`);

    expect(screen.getByRole('heading', { level: 1, name: 'Product not found' })).toBeTruthy();
    expect(within(main()).getByRole('link', { name: 'Go to the home page' })).toBeTruthy();
    expect(mockedGetProduct).not.toHaveBeenCalled();
  });

  it.each([404, 400])('shows "Product not found" for an API %i', async (status) => {
    mockedGetProduct.mockRejectedValue(new ApiError(status, 'NOT_FOUND', 'Product 999 not found'));
    renderApp('/products/999');

    expect(await screen.findByRole('heading', { level: 1, name: 'Product not found' })).toBeTruthy();
    expect(document.title).toBe('Product not found | Product Catalogue');
  });

  it('shows other errors with a retry', async () => {
    mockedGetProduct.mockRejectedValueOnce(new ApiError(502, 'UPSTREAM_ERROR', 'The product service is unavailable. Please try again.'));
    renderApp('/products/1');

    const alert = await within(main()).findByRole('alert');
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Fjallraven Backpack' })).toBeTruthy();
  });
});

describe('enquiry form: opening and focus', () => {
  it('opens inline with focus on the first field, and Cancel returns focus to Enquire', async () => {
    await openEnquiry();

    expect(screen.getByRole('form', { name: 'Enquire about Fjallraven Backpack' })).toBeTruthy();
    expect(document.activeElement).toBe(field(/^Name/));

    await userEvent.click(within(main()).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('form')).toBeNull();
    expect(document.activeElement).toBe(within(main()).getByRole('button', { name: 'Enquire' }));
  });

  it('labels every field and marks which are optional', async () => {
    await openEnquiry();

    expect(field(/^Name$/).getAttribute('aria-required')).toBe('true');
    expect(field(/^Email$/).getAttribute('aria-required')).toBe('true');
    expect(field(/^Phone \(optional\)$/)).toBeTruthy();
    expect(field(/^Message \(optional\)$/).tagName).toBe('TEXTAREA');
  });
});

describe('enquiry form: client-side validation', () => {
  it('shows inline errors tied to the fields, focuses the first, and does not submit', async () => {
    await openEnquiry();
    await userEvent.type(field(/^Phone/), 'call me');
    await userEvent.click(within(main()).getByRole('button', { name: 'Send enquiry' }));

    const name = field(/^Name/);
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toBe('enquiry-name-error');
    expect(document.getElementById('enquiry-name-error')?.textContent).toBe('Enter your name');
    expect(field(/^Email/).getAttribute('aria-describedby')).toBe('enquiry-email-hint enquiry-email-error');
    expect(field(/^Phone/).getAttribute('aria-invalid')).toBe('true');
    expect(field(/^Message/).getAttribute('aria-invalid')).toBeNull();
    expect(document.activeElement).toBe(name);
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it('clears an error as soon as the field is fixed', async () => {
    await openEnquiry();
    await userEvent.click(within(main()).getByRole('button', { name: 'Send enquiry' }));
    await userEvent.type(field(/^Name/), 'Ann');

    expect(field(/^Name/).getAttribute('aria-invalid')).toBeNull();
    expect(field(/^Email/).getAttribute('aria-invalid')).toBe('true');
  });
});

describe('enquiry form: submitting', () => {
  it('disables the button while sending, ignores double clicks, then thanks the customer by product', async () => {
    let resolve!: (value: EnquiryAccepted) => void;
    mockedSubmit.mockReturnValue(new Promise((done) => (resolve = done)));
    await openEnquiry();
    await fillValid();

    const send = within(main()).getByRole('button', { name: 'Send enquiry' });
    await userEvent.click(send);
    await userEvent.click(send);

    const sending = within(main()).getByRole('button', { name: 'Sending…' });
    expect(sending).toHaveProperty('disabled', true);
    expect(within(main()).getByText('Sending your enquiry…')).toBeTruthy();
    expect(mockedSubmit).toHaveBeenCalledOnce();
    expect(mockedSubmit).toHaveBeenCalledWith(
      { productId: 1, name: 'Ann Lee', email: 'ann@example.test' },
      expect.any(AbortSignal),
    );

    await act(async () => resolve({ ok: true }));

    const thanks = screen.getByRole('heading', { level: 2, name: 'Thank you' });
    expect(document.activeElement).toBe(thanks);
    expect(main().textContent).toContain('We’ve sent your enquiry about Fjallraven Backpack to our sales team.');
    expect(screen.queryByRole('form')).toBeNull();
    expect(within(main()).queryByRole('button', { name: 'Enquire' })).toBeNull();
  });

  it('sends phone and message when given', async () => {
    await openEnquiry();
    await fillValid();
    await userEvent.type(field(/^Phone/), '+61 400 000 000');
    await userEvent.type(field(/^Message/), 'Is it waterproof?');
    await userEvent.click(within(main()).getByRole('button', { name: 'Send enquiry' }));

    expect(mockedSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+61 400 000 000', message: 'Is it waterproof?' }),
      expect.any(AbortSignal),
    );
  });

  it('maps a 400 onto the fields and focuses the first one', async () => {
    mockedSubmit.mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Request is invalid', [{ path: 'email', message: 'must be a valid email address' }]),
    );
    await openEnquiry();
    await fillValid();
    await userEvent.click(within(main()).getByRole('button', { name: 'Send enquiry' }));

    const email = field(/^Email/);
    expect(await within(main()).findByText('Email must be a valid email address')).toBeTruthy();
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(email);
    expect(field(/^Name/)).toHaveProperty('value', '  Ann Lee ');
  });

  it.each([
    [502, 'EMAIL_FAILED', 'We couldn’t send your enquiry. Please try again in a moment.'],
    [404, 'NOT_FOUND', 'this product is no longer available'],
    [429, 'RATE_LIMITED', 'Please wait a minute and try again.'],
  ])('on %i shows a clear error and keeps the values for a retry', async (status, code, text) => {
    mockedSubmit.mockRejectedValueOnce(new ApiError(status, code, 'server text')).mockResolvedValueOnce({ ok: true });
    await openEnquiry();
    await fillValid();
    await userEvent.type(field(/^Message/), 'Hello');
    await userEvent.click(within(main()).getByRole('button', { name: 'Send enquiry' }));

    const alert = await within(main()).findByRole('alert');
    expect(alert.textContent).toContain(text);
    expect(field(/^Name/)).toHaveProperty('value', '  Ann Lee ');
    expect(field(/^Message/)).toHaveProperty('value', 'Hello');

    await userEvent.click(within(main()).getByRole('button', { name: 'Send enquiry' }));
    expect(await screen.findByRole('heading', { name: 'Thank you' })).toBeTruthy();
  });

  it('shows the generic error for a network failure', async () => {
    mockedSubmit.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.'));
    await openEnquiry();
    await fillValid();
    await userEvent.click(within(main()).getByRole('button', { name: 'Send enquiry' }));

    expect((await within(main()).findByRole('alert')).textContent).toContain('Your details are still here.');
  });

  it('never writes to localStorage or sessionStorage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await openEnquiry();
    await fillValid();
    await userEvent.click(within(main()).getByRole('button', { name: 'Send enquiry' }));
    await screen.findByRole('heading', { name: 'Thank you' });

    expect(setItem).not.toHaveBeenCalled();
  });
});
