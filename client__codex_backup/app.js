const DEFAULT_API_BASE = 'http://localhost:5000/api';
const STORAGE_KEYS = {
    apiBase: 'eventora-api-base',
    session: 'eventora-session'
};

const state = {
    apiBase: localStorage.getItem(STORAGE_KEYS.apiBase) || DEFAULT_API_BASE,
    session: readSession(),
    events: [],
    bookings: []
};

const els = {
    apiBase: document.querySelector('#apiBase'),
    authStatus: document.querySelector('#auth-status'),
    sessionName: document.querySelector('#sessionName'),
    sessionMeta: document.querySelector('#sessionMeta'),
    adminPanel: document.querySelector('#adminPanel'),
    eventsGrid: document.querySelector('#eventsGrid'),
    bookingsList: document.querySelector('#bookingsList'),
    adminEventsList: document.querySelector('#adminEventsList'),
    filterCategory: document.querySelector('#filterCategory'),
    filterLocation: document.querySelector('#filterLocation'),
    toast: document.querySelector('#toast'),
    loginForm: document.querySelector('#loginForm'),
    registerForm: document.querySelector('#registerForm'),
    otpForm: document.querySelector('#otpForm'),
    eventForm: document.querySelector('#eventForm')
};

function readSession() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.session) || 'null');
    } catch {
        return null;
    }
}

function writeSession(session) {
    state.session = session;
    if (session) {
        localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    } else {
        localStorage.removeItem(STORAGE_KEYS.session);
    }
    syncSessionUI();
}

function showToast(message, isError = false) {
    els.toast.textContent = message;
    els.toast.style.borderColor = isError ? 'rgba(180, 67, 50, 0.24)' : 'rgba(10, 123, 120, 0.18)';
    els.toast.classList.add('visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        els.toast.classList.remove('visible');
    }, 2600);
}

function formatDate(value) {
    if (!value) {
        return 'Date unavailable';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

function formatCurrency(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

function buildHeaders(withAuth = false) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (withAuth && state.session?.token) {
        headers.Authorization = `Bearer ${state.session.token}`;
    }

    return headers;
}

async function apiFetch(path, options = {}) {
    const response = await fetch(`${state.apiBase}${path}`, {
        ...options,
        headers: {
            ...buildHeaders(Boolean(options.auth)),
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
}

function syncSessionUI() {
    els.apiBase.value = state.apiBase;

    if (!state.session) {
        els.authStatus.textContent = 'Guest';
        els.sessionName.textContent = 'No active user';
        els.sessionMeta.textContent = 'Sign in to unlock bookings and admin tools.';
        els.adminPanel.style.display = 'none';
        return;
    }

    els.authStatus.textContent = state.session.role === 'admin' ? 'Admin' : 'User';
    els.sessionName.textContent = state.session.name;
    els.sessionMeta.textContent = `${state.session.email} · ${state.session.role}`;
    els.adminPanel.style.display = state.session.role === 'admin' ? 'block' : 'none';
}

function renderEvents() {
    els.eventsGrid.innerHTML = '';

    if (!state.events.length) {
        els.eventsGrid.innerHTML = '<div class="empty-state">No events found for the current filters.</div>';
        return;
    }

    const template = document.querySelector('#eventCardTemplate');

    state.events.forEach((event) => {
        const node = template.content.firstElementChild.cloneNode(true);
        const image = node.querySelector('.event-image');
        const categoryPill = node.querySelector('.category-pill');
        const seatsPill = node.querySelector('.seats-pill');
        const title = node.querySelector('.event-title');
        const description = node.querySelector('.event-description');
        const meta = node.querySelector('.event-meta');
        const price = node.querySelector('.event-price');
        const otpInput = node.querySelector('.otp-input');
        const sendOtpBtn = node.querySelector('.send-otp-btn');
        const bookBtn = node.querySelector('.book-btn');

        image.src = event.imageUrl;
        image.alt = event.title;
        categoryPill.textContent = event.category;
        seatsPill.textContent = `${event.availableSeats} seats left`;
        title.textContent = event.title;
        description.textContent = event.description;
        meta.innerHTML = `
            <span>${formatDate(event.date)} · ${event.time || 'Time TBA'}</span>
            <span>${event.location}</span>
        `;
        price.textContent = formatCurrency(event.price);

        sendOtpBtn.addEventListener('click', async () => {
            if (!state.session?.token) {
                showToast('Login first to request a booking OTP.', true);
                return;
            }

            try {
                const result = await apiFetch('/bookings/send-otp', {
                    method: 'POST',
                    auth: true,
                    body: JSON.stringify({ email: state.session.email })
                });
                showToast(result.message || 'OTP sent.');
            } catch (error) {
                showToast(error.message, true);
            }
        });

        bookBtn.addEventListener('click', async () => {
            if (!state.session?.token) {
                showToast('Login first to book this event.', true);
                return;
            }

            if (!otpInput.value.trim()) {
                showToast('Enter the OTP sent to your email.', true);
                return;
            }

            try {
                const result = await apiFetch('/bookings', {
                    method: 'POST',
                    auth: true,
                    body: JSON.stringify({ eventId: event._id, otp: otpInput.value.trim() })
                });
                otpInput.value = '';
                showToast(result.message || 'Booking successful.');
                await fetchBookings();
                await fetchEvents();
            } catch (error) {
                showToast(error.message, true);
            }
        });

        els.eventsGrid.appendChild(node);
    });
}

function renderBookings() {
    els.bookingsList.innerHTML = '';

    if (!state.session?.token) {
        els.bookingsList.textContent = 'Log in to view your bookings.';
        els.bookingsList.className = 'stack-list empty-state';
        return;
    }

    els.bookingsList.className = 'stack-list';

    if (!state.bookings.length) {
        els.bookingsList.innerHTML = '<div class="empty-state">No bookings yet.</div>';
        return;
    }

    const template = document.querySelector('#bookingItemTemplate');
    state.bookings.forEach((booking) => {
        const node = template.content.firstElementChild.cloneNode(true);
        const title = node.querySelector('.booking-title');
        const meta = node.querySelector('.booking-meta');
        const status = node.querySelector('.booking-status');
        const cancelBtn = node.querySelector('.cancel-booking-btn');
        const event = booking.eventId;

        title.textContent = event?.title || 'Untitled event';
        meta.textContent = `${formatDate(event?.date)} · ${event?.location || 'Unknown location'} · ${formatCurrency(booking.totalPrice)}`;
        status.textContent = `${booking.status} · ${booking.paymentStatus}`;

        cancelBtn.addEventListener('click', async () => {
            try {
                const result = await apiFetch(`/bookings/${booking._id}`, {
                    method: 'DELETE',
                    auth: true
                });
                showToast(result.message || 'Booking cancelled.');
                await fetchBookings();
                await fetchEvents();
            } catch (error) {
                showToast(error.message, true);
            }
        });

        els.bookingsList.appendChild(node);
    });
}

function renderAdminEvents() {
    els.adminEventsList.innerHTML = '';

    if (state.session?.role !== 'admin') {
        els.adminEventsList.textContent = 'Log in as an admin to manage events.';
        els.adminEventsList.className = 'stack-list empty-state';
        return;
    }

    els.adminEventsList.className = 'stack-list';

    if (!state.events.length) {
        els.adminEventsList.innerHTML = '<div class="empty-state">No events available.</div>';
        return;
    }

    const template = document.querySelector('#adminEventItemTemplate');
    state.events.forEach((event) => {
        const node = template.content.firstElementChild.cloneNode(true);
        node.querySelector('.admin-title').textContent = event.title;
        node.querySelector('.admin-meta').textContent = `${event.category} · ${event.location} · ${formatDate(event.date)} · ${event.availableSeats}/${event.totalSeats} seats`;
        node.querySelector('.edit-event-btn').addEventListener('click', () => fillEventForm(event));
        node.querySelector('.delete-event-btn').addEventListener('click', async () => {
            try {
                const result = await apiFetch(`/events/${event._id}`, {
                    method: 'DELETE',
                    auth: true
                });
                showToast(result.message || 'Event deleted.');
                await fetchEvents();
            } catch (error) {
                showToast(error.message, true);
            }
        });

        els.adminEventsList.appendChild(node);
    });
}

function fillEventForm(event) {
    const form = els.eventForm;
    form.eventId.value = event._id;
    form.title.value = event.title || '';
    form.description.value = event.description || '';
    form.date.value = (event.date || '').slice(0, 10);
    form.time.value = event.time || '';
    form.location.value = event.location || '';
    form.category.value = event.category || '';
    form.totalSeats.value = event.totalSeats ?? '';
    form.availableSeats.value = event.availableSeats ?? '';
    form.price.value = event.price ?? '';
    form.imageUrl.value = event.imageUrl || '';
}

function resetEventForm() {
    els.eventForm.reset();
    els.eventForm.eventId.value = '';
}

async function fetchEvents() {
    const params = new URLSearchParams();
    if (els.filterCategory.value.trim()) {
        params.set('category', els.filterCategory.value.trim());
    }
    if (els.filterLocation.value.trim()) {
        params.set('location', els.filterLocation.value.trim());
    }

    const suffix = params.toString() ? `?${params.toString()}` : '';
    const events = await apiFetch(`/events${suffix}`);
    state.events = Array.isArray(events) ? events : [];
    renderEvents();
    renderAdminEvents();
}

async function fetchBookings() {
    if (!state.session?.token) {
        state.bookings = [];
        renderBookings();
        return;
    }

    const bookings = await apiFetch('/bookings/my', { auth: true });
    state.bookings = Array.isArray(bookings) ? bookings : [];
    renderBookings();
}

async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
        const result = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        writeSession(result);
        event.currentTarget.reset();
        showToast(result.message || 'Logged in.');
        await fetchEvents();
        await fetchBookings();
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
        const result = await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password'),
                role: 'user'
            })
        });
        els.otpForm.email.value = formData.get('email');
        event.currentTarget.reset();
        showToast(result.message || 'Registration complete. Verify your OTP.');
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleOtpVerify(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
        const result = await apiFetch('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({
                email: formData.get('email'),
                otp: formData.get('otp')
            })
        });
        writeSession(result);
        event.currentTarget.reset();
        showToast(result.message || 'Email verified.');
        await fetchEvents();
        await fetchBookings();
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleEventSave(event) {
    event.preventDefault();

    if (state.session?.role !== 'admin') {
        showToast('Admin login required to manage events.', true);
        return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
        title: formData.get('title'),
        description: formData.get('description'),
        date: formData.get('date'),
        time: formData.get('time'),
        location: formData.get('location'),
        category: formData.get('category'),
        totalSeats: Number(formData.get('totalSeats')),
        availableSeats: formData.get('availableSeats') ? Number(formData.get('availableSeats')) : Number(formData.get('totalSeats')),
        price: Number(formData.get('price')),
        imageUrl: formData.get('imageUrl')
    };

    const eventId = formData.get('eventId');
    const method = eventId ? 'PUT' : 'POST';
    const path = eventId ? `/events/${eventId}` : '/events';

    try {
        await apiFetch(path, {
            method,
            auth: true,
            body: JSON.stringify(payload)
        });
        resetEventForm();
        showToast(eventId ? 'Event updated.' : 'Event created.');
        await fetchEvents();
    } catch (error) {
        showToast(error.message, true);
    }
}

function wireEvents() {
    document.querySelector('#saveApiBase').addEventListener('click', () => {
        state.apiBase = els.apiBase.value.trim() || DEFAULT_API_BASE;
        localStorage.setItem(STORAGE_KEYS.apiBase, state.apiBase);
        showToast('API base saved.');
        initializeData();
    });

    document.querySelector('#refreshEvents').addEventListener('click', fetchEvents);
    document.querySelector('#refreshBookings').addEventListener('click', fetchBookings);
    document.querySelector('#applyFilters').addEventListener('click', fetchEvents);
    document.querySelector('#clearFilters').addEventListener('click', async () => {
        els.filterCategory.value = '';
        els.filterLocation.value = '';
        await fetchEvents();
    });
    document.querySelector('#logoutBtn').addEventListener('click', async () => {
        writeSession(null);
        state.bookings = [];
        renderBookings();
        renderAdminEvents();
        showToast('Logged out.');
        await fetchEvents();
    });
    document.querySelector('#resetEventForm').addEventListener('click', resetEventForm);
    document.querySelector('[data-action="jump-events"]').addEventListener('click', () => {
        document.querySelector('#events-anchor').scrollIntoView({ behavior: 'smooth' });
    });
    document.querySelector('[data-action="jump-auth"]').addEventListener('click', () => {
        document.querySelector('#auth-anchor').scrollIntoView({ behavior: 'smooth' });
    });

    els.loginForm.addEventListener('submit', handleLogin);
    els.registerForm.addEventListener('submit', handleRegister);
    els.otpForm.addEventListener('submit', handleOtpVerify);
    els.eventForm.addEventListener('submit', handleEventSave);
}

async function initializeData() {
    syncSessionUI();

    try {
        await fetchEvents();
    } catch (error) {
        showToast(error.message, true);
    }

    try {
        await fetchBookings();
    } catch (error) {
        showToast(error.message, true);
    }
}

wireEvents();
initializeData();
