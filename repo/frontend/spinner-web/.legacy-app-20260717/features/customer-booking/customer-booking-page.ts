import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { BookingApiService } from '../../core/api/booking-api.service';
import { ServicesPricingApiService } from '../../core/api/services-pricing-api.service';
import {
  BookingConfirmationResponse,
  CreateBookingRequest,
  PaymentMethod,
  ServiceResponse
} from '../../shared/models/booking.models';

type ServiceOption = {
  id: string | null;
  name: string;
  description: string;
  icon: string;
  selected: boolean;
  supportsPickupAndDelivery: boolean;
};

type BookingField = {
  control: keyof CustomerBookingPage['bookingForm']['controls'];
  label: string;
  placeholder: string;
  icon: string;
  type: string;
  autocomplete: string;
};

@Component({
  selector: 'app-customer-booking-page',
  imports: [ReactiveFormsModule],
  templateUrl: './customer-booking-page.html',
  styleUrl: './customer-booking-page.scss'
})
export class CustomerBookingPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly servicesPricingApi = inject(ServicesPricingApiService);
  private readonly bookingApi = inject(BookingApiService);
  private readonly router = inject(Router);
  private readonly iconBase = 'assets/icons/';

  protected readonly bookingForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(160)]],
    mobileNumber: ['', [Validators.required, Validators.maxLength(40)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    serviceType: ['Wash, Dry & Fold', Validators.required],
    address: ['', [Validators.required, Validators.maxLength(500)]],
    preferredDate: ['', Validators.required],
    preferredTime: ['', [Validators.required, Validators.maxLength(120)]],
    paymentMethod: ['Cash on Delivery' as 'Cash on Delivery' | 'QR Code Online Payment'],
    additionalNotes: ['', Validators.maxLength(1000)]
  });

  protected services: ServiceOption[] = [
    {
      id: null,
      name: 'Wash, Dry & Fold',
      description: 'Clean, dry and neatly folded for you.',
      icon: `${this.iconBase}wash-dry-fold.svg`,
      selected: true,
      supportsPickupAndDelivery: false
    },
    {
      id: null,
      name: 'Drop-off',
      description: 'Drop off your laundry and we will handle the rest.',
      icon: `${this.iconBase}drop-off.svg`,
      selected: false,
      supportsPickupAndDelivery: false
    },
    {
      id: null,
      name: 'Self-Service',
      description: 'Use our machines with a clean shop setup.',
      icon: `${this.iconBase}self-service.svg`,
      selected: false,
      supportsPickupAndDelivery: false
    },
    {
      id: null,
      name: 'Pickup & Delivery',
      description: 'Schedule pickup and delivery at your address.',
      icon: `${this.iconBase}pickup-delivery.svg`,
      selected: false,
      supportsPickupAndDelivery: true
    }
  ];

  protected readonly fields: BookingField[] = [
    { control: 'fullName', label: 'Full Name', placeholder: 'Enter your full name', icon: `${this.iconBase}full-name.svg`, type: 'text', autocomplete: 'name' },
    { control: 'mobileNumber', label: 'Mobile Number', placeholder: '09XX XXX XXXX', icon: `${this.iconBase}mobile-number.svg`, type: 'tel', autocomplete: 'tel' },
    { control: 'email', label: 'Email Address', placeholder: 'Optional email for receipt', icon: `${this.iconBase}email.svg`, type: 'email', autocomplete: 'email' },
    { control: 'serviceType', label: 'Service Type', placeholder: 'Select service type', icon: `${this.iconBase}service-type.svg`, type: 'text', autocomplete: 'off' },
    { control: 'address', label: 'Address', placeholder: 'House/Unit No., Street, Barangay, City', icon: `${this.iconBase}address.svg`, type: 'text', autocomplete: 'street-address' },
    { control: 'preferredDate', label: 'Preferred Date', placeholder: 'Select date', icon: `${this.iconBase}preferred-date.svg`, type: 'date', autocomplete: 'off' },
    { control: 'preferredTime', label: 'Preferred Time', placeholder: 'Example: 8:00 AM - 10:00 AM', icon: `${this.iconBase}preferred-time.svg`, type: 'text', autocomplete: 'off' },
    { control: 'additionalNotes', label: 'Additional Notes', placeholder: 'Special instructions, gate code, landmark', icon: `${this.iconBase}additional-notes.svg`, type: 'text', autocomplete: 'off' }
  ];

  protected isSubmitting = false;
  protected isLoadingServices = false;
  protected submitError = '';

  ngOnInit() {
    this.loadServices();
  }

  protected selectService(service: ServiceOption) {
    this.services = this.services.map((item) => ({
      ...item,
      selected: item.name === service.name ? !item.selected : item.selected
    }));
    this.updateServiceTypeValue();
  }

  protected selectPaymentMethod(paymentMethod: 'Cash on Delivery' | 'QR Code Online Payment') {
    this.bookingForm.controls.paymentMethod.setValue(paymentMethod);
  }

  protected isInvalid(controlName: BookingField['control']) {
    const control = this.bookingForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  protected errorFor(controlName: BookingField['control']) {
    const control = this.bookingForm.controls[controlName];

    if (control.hasError('required')) return 'This field is required.';
    if (control.hasError('email')) return 'Enter a valid email address.';
    if (control.hasError('maxlength')) return 'This value is too long.';

    return '';
  }

  protected submitBooking() {
    this.submitError = '';

    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      this.submitError = 'Please complete the required booking details.';
      return;
    }

    const selectedServices = this.selectedServices();
    const primaryService = this.primaryService();
    if (selectedServices.length === 0) {
      this.submitError = 'Please choose at least one laundry service.';
      return;
    }

    if (!primaryService?.id) {
      this.submitError = 'Services are still unavailable. Please try again after the page finishes loading.';
      return;
    }

    this.isSubmitting = true;

    this.bookingApi
      .createBooking(this.toCreateBookingRequest(primaryService, selectedServices))
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (confirmation) => this.goToConfirmation(confirmation),
        error: () => {
          this.submitError = 'We could not submit your booking right now. Please check the details and try again.';
        }
      });
  }

  private loadServices() {
    this.isLoadingServices = true;
    this.servicesPricingApi
      .getActiveServices()
      .pipe(finalize(() => (this.isLoadingServices = false)))
      .subscribe({
        next: (services) => this.applyServices(services),
        error: () => {
          this.submitError = 'Service pricing could not be loaded yet. You can still review the form.';
        }
      });
  }

  private applyServices(services: ServiceResponse[]) {
    if (services.length === 0) return;

    const currentName = this.bookingForm.controls.serviceType.value;
    this.services = services.map((service, index) => ({
      id: service.id,
      name: service.name,
      description: service.description ?? this.descriptionFor(service.name),
      icon: this.iconFor(service.name),
      selected: service.name === currentName || (!services.some((item) => item.name === currentName) && index === 0),
      supportsPickupAndDelivery: service.supportsPickupAndDelivery
    }));

    this.updateServiceTypeValue();
  }

  private selectedServices() {
    return this.services.filter((service) => service.selected);
  }

  private primaryService() {
    return this.selectedServices()[0];
  }

  private updateServiceTypeValue() {
    const selectedNames = this.selectedServices().map((service) => service.name);
    this.bookingForm.controls.serviceType.setValue(selectedNames.join(', '));
  }

  private toCreateBookingRequest(service: ServiceOption, selectedServices: ServiceOption[]): CreateBookingRequest {
    const value = this.bookingForm.getRawValue();
    const requestedServices = selectedServices.map((item) => item.name).join(', ');
    const additionalNotes = value.additionalNotes.trim();

    return {
      fullName: value.fullName.trim(),
      mobileNumber: value.mobileNumber.trim(),
      emailAddress: value.email.trim() || null,
      serviceId: service.id!,
      fulfillmentType: this.fulfillmentTypeFor(service),
      address: value.address.trim(),
      preferredDate: value.preferredDate,
      preferredTimeWindow: value.preferredTime.trim(),
      paymentMethod: this.paymentMethodFor(value.paymentMethod),
      loadCount: 1,
      additionalNotes: [
        selectedServices.length > 1 ? `Requested services: ${requestedServices}` : '',
        additionalNotes
      ].filter(Boolean).join('\n') || null
    };
  }

  private goToConfirmation(confirmation: BookingConfirmationResponse) {
    this.router.navigate(['/booking-confirmation', confirmation.orderCode], {
      state: { confirmation }
    });
  }

  private fulfillmentTypeFor(service: ServiceOption) {
    return service.supportsPickupAndDelivery || service.name.toLowerCase().includes('pickup')
      ? 'PickupAndDelivery'
      : 'DropOff';
  }

  private paymentMethodFor(paymentMethod: string): PaymentMethod {
    return paymentMethod === 'QR Code Online Payment' ? 'QrCodeOnlinePayment' : 'CashOnDelivery';
  }

  private iconFor(name: string) {
    const normalized = name.toLowerCase();
    if (normalized.includes('drop')) return `${this.iconBase}drop-off.svg`;
    if (normalized.includes('self')) return `${this.iconBase}self-service.svg`;
    if (normalized.includes('pickup') || normalized.includes('delivery')) return `${this.iconBase}pickup-delivery.svg`;
    return `${this.iconBase}wash-dry-fold.svg`;
  }

  private descriptionFor(name: string) {
    const normalized = name.toLowerCase();
    if (normalized.includes('drop')) return 'Drop off your laundry and we will handle the rest.';
    if (normalized.includes('self')) return 'Use our machines with a clean shop setup.';
    if (normalized.includes('pickup') || normalized.includes('delivery')) return 'Schedule pickup and delivery at your address.';
    return 'Clean, dry and neatly folded for you.';
  }
}
