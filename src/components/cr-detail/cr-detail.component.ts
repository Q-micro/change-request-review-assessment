import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrApiService } from '../../api/cr-api.service';
import { SessionService } from '../../session/session.service';
import { CrDetail, TimelineEntry } from '../../models/cr.models';
import { idle, loading, ViewState } from '../../common/view-state';
import { computeDiff, DiffRow } from '../diff.util';
import { formatMoney } from '../../common/money.util';
import { canApprovePolicy } from '../../common/permissions';
/**
 * Change Request DETAIL page: loads a CR and renders the diff/preview, the approval timeline, and
 * permission-aware Approve/Reject actions. `load`, the diff binding, and the template skeleton are
 * provided; the timeline ordering, permission gating, actions, and reject validation are yours.
 */
@Component({
	selector: 'app-cr-detail',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule],
	templateUrl: './cr-detail.component.html',
})
export class CrDetailComponent implements OnChanges {

	@Input() id!: string;
	// Sends the updated CR to the parent component after a successful approve/reject.
   //This lets the parent refresh the list so its status stays in sync with the detail view.
    @Output() statusChanged = new EventEmitter<CrDetail>();
	state: ViewState<CrDetail> = idle();
	submitting = false;
	actionError?: string;
	// TODO: add validation so the form is invalid until a reason is entered.
	//reason for rejection is required when rejecting a CR
rejectControl = new FormControl('', {
	nonNullable: true,
	validators: [Validators.required],
});
	constructor(private readonly api: CrApiService, private readonly session: SessionService) {}

	ngOnChanges(changes: SimpleChanges): void {
	if (changes['id'] && this.id) {
		void this.load();
	}
}

	async load(): Promise<void> {
		this.state = loading();
		this.actionError = undefined;
		try {
			const detail = await this.api.getChangeRequest(this.session.user, this.id);
			this.state = { status: 'loaded', data: detail };
		} catch (err) {
			this.state = { status: 'error', data: null, error: (err as Error).message };
		}
	}

	get detail(): CrDetail | null {
		return this.state.data;
	}

	get diff(): DiffRow[] {
		return this.detail ? computeDiff(this.detail.baselineLineItems, this.detail.proposedLineItems) : [];
	}

	/** Approval timeline, oldest-first. */
	get timeline(): TimelineEntry[] {
		// TODO: return the audit entries ordered chronologically (oldest first).
		// Sort a copy of the audit entries by timestamp, oldest first.
return [...(this.detail?.audit ?? [])].sort(
	(a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
);
	}

	/** Whether the current user may approve the loaded CR. */
	get canApprove(): boolean {
		// NOTE: this only looks at the CR status. The UI must also respect the user's permissions.
		// Approve requires both the correct CR status and an approval policy.
		return this.detail?.status === 'PENDING_APPROVAL' && canApprovePolicy(this.session.user);
	}

	get canReject(): boolean {
	// Reject requires both the correct CR status and an approval policy.
	return this.detail?.status === 'PENDING_APPROVAL' && canApprovePolicy(this.session.user);	}

	fmt(amount: number): string {
		return this.detail ? formatMoney(amount, this.detail.currency) : String(amount);
	}

async approve(): Promise<void> {
	if (!this.canApprove || this.submitting || !this.detail) return;

	this.submitting = true;
	this.actionError = undefined;

	try {
		const updated = await this.api.approve(this.session.user, this.detail.id, new Date().toISOString());
		this.state = { status: 'loaded', data: updated };
		this.statusChanged.emit(updated);
	} catch (err) {
		this.actionError = (err as Error).message;
	} finally {
		this.submitting = false;
	}
}

async reject(): Promise<void> {
	if (!this.canReject || this.submitting || !this.detail) return;

	this.rejectControl.markAsTouched();

	if (this.rejectControl.invalid) return;

	this.submitting = true;
	this.actionError = undefined;

	try {
		const updated = await this.api.reject(
			this.session.user,
			this.detail.id,
			new Date().toISOString(),
			this.rejectControl.value.trim()
		);

		this.state = { status: 'loaded', data: updated };
		this.statusChanged.emit(updated);
	} catch (err) {
		this.actionError = (err as Error).message;
	} finally {
		this.submitting = false;
	}
}
}
