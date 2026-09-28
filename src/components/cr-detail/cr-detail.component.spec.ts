import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';
import { CrApiService } from '../../api/cr-api.service';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrDetailComponent);
	fixture.componentInstance.id = id;
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded state
	return fixture;
}

describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});


	//test
	it('renders the diff, totals, and chronological timeline', async () => {
	const fixture = await render(users.approver, 'CR-1');
	const el = fixture.nativeElement;

	expect(el.querySelector('.cr-detail__totals').textContent).toContain('8,000');
	expect(el.querySelector('.cr-detail__totals').textContent).toContain('8,500');
	expect(el.querySelector('.cr-detail__delta').textContent).toContain('500');

	const rows = el.querySelectorAll('.cr-diff__row');
	expect(rows.length).toBe(2);
	expect(rows[0].textContent).toContain('SKU-A');
	expect(rows[0].getAttribute('data-kind')).toBe('changed');

	const timeline = el.querySelectorAll('.cr-timeline__entry');
	expect(timeline.length).toBe(3);
	expect(timeline[0].textContent).toContain('CREATE');
	expect(timeline[2].textContent).toContain('SEND_FOR_APPROVAL');
});

	it('disables Approve for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1'); // viewer: cr_r_o only; CR-1 is PENDING_APPROVAL
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
	});

//test description-only change 
	it('renders description changes in the diff', async () => {
	const fixture = await render(users.approver, 'CR-2');
	const rows = fixture.nativeElement.querySelectorAll('.cr-diff__row');

	expect(rows.length).toBe(1);
	expect(rows[0].getAttribute('data-kind')).toBe('changed');
expect(rows[0].textContent).toContain('Widget B');
expect(rows[0].textContent).toContain('Widget B (new supplier)');
});

//test 
	it('does not show Reject controls to a read-only viewer', async () => {
	const fixture = await render(users.viewer, 'CR-1');

	expect(
		fixture.nativeElement.querySelector('.cr-actions__reject')
	).toBeNull();
});

	//Approve test 
	it('approves a pending change request', async () => {
	const fixture = await render(users.approver, 'CR-1');

	await fixture.componentInstance.approve();
	fixture.detectChanges();

	expect(fixture.componentInstance.detail?.status).toBe('APPROVED');
	expect(fixture.nativeElement.querySelector('.cr-status').textContent).toContain('APPROVED');
});

//test for approve failure
it('shows an error when approve fails', async () => {
	const fixture = await render(users.approver, 'CR-1');
	const api = TestBed.inject(CrApiService);

	api.failNext = true;

	await fixture.componentInstance.approve();
	fixture.detectChanges();

	expect(fixture.componentInstance.detail?.status).toBe('PENDING_APPROVAL');
	expect(fixture.componentInstance.actionError).toBe('Network error');
	expect(fixture.componentInstance.submitting).toBe(false);
});

//test for reject failure
it('shows an error when reject fails', async () => {
	const fixture = await render(users.approver, 'CR-1');
	const api = TestBed.inject(CrApiService);

	fixture.componentInstance.rejectControl.setValue('Invalid change');

	api.failNext = true;

	await fixture.componentInstance.reject();
	fixture.detectChanges();

	expect(fixture.componentInstance.detail?.status).toBe('PENDING_APPROVAL');
	expect(fixture.componentInstance.actionError).toBe('Network error');
	expect(fixture.componentInstance.submitting).toBe(false);
});

//test for preventing duplicate approve requests
it('prevents duplicate approve requests while submitting', async () => {
	const fixture = await render(users.approver, 'CR-1');
	const api = TestBed.inject(CrApiService);

	api.latencyMs = 50;

	const first = fixture.componentInstance.approve();
	const second = fixture.componentInstance.approve();

	await Promise.all([first, second]);

	expect(fixture.componentInstance.detail?.status).toBe('APPROVED');
});

//Reject test
it('rejects a pending change request with a reason', async () => {
	const fixture = await render(users.approver, 'CR-1');

	fixture.componentInstance.rejectControl.setValue('Price is too high');

	await fixture.componentInstance.reject();
	fixture.detectChanges();

	expect(fixture.componentInstance.detail?.status).toBe('REJECTED');
	expect(fixture.nativeElement.querySelector('.cr-status').textContent).toContain('REJECTED');
});

//test for rejecting without a reason
it('does not reject when the reason is empty', async () => {
	const fixture = await render(users.approver, 'CR-1');

	await fixture.componentInstance.reject();
	fixture.detectChanges();

	expect(fixture.componentInstance.detail?.status).toBe('PENDING_APPROVAL');
	expect(fixture.componentInstance.rejectControl.touched).toBe(true);
});
});
