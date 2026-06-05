describe('Appointments Flow', () => {
  beforeEach(() => {
    // Stub Auth
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        id: 1,
        username: 'patient1',
        roles: ['ROLE_PATIENT']
      }
    }).as('getAuth');

    // Stub fetching doctors
    cy.intercept('GET', '**/api/doctors/all', {
      statusCode: 200,
      body: [
        {
          id: 1,
          specialization: 'Cardiologist',
          user: { fullName: 'John Doe' }
        },
        {
          id: 2,
          specialization: 'Dermatologist',
          user: { fullName: 'Jane Smith' }
        }
      ]
    }).as('getDoctors');

    // Stub fetching appointments
    cy.intercept('GET', '**/api/appointments/patient', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 1,
            doctorName: 'John Doe',
            doctorSpecialization: 'Cardiologist',
            patientName: 'Patient One',
            appointmentDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
            durationMinutes: 30,
            status: 'PENDING',
            symptomsSummary: 'Chest pain'
          }
        ]
      }
    }).as('getAppointments');

    cy.visit('/dashboard/appointments');
    cy.wait(['@getAuth', '@getAppointments', '@getDoctors']);
  });

  it('displays the upcoming appointments list', () => {
    cy.contains('Schedule Overview').should('be.visible');
    cy.contains('Dr. John Doe').should('be.visible');
    cy.contains('Cardiologist').should('be.visible');
    cy.contains('PENDING').should('be.visible');
  });

  it('allows the user to cancel an appointment', () => {
    // Intercept cancellation API
    cy.intercept('PATCH', '**/api/appointments/1/cancel', {
      statusCode: 200,
      body: { status: 'SUCCESS' }
    }).as('cancelAppointment');

    // Intercept refetch of appointments after cancellation
    cy.intercept('GET', '**/api/appointments/patient', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 1,
            doctorName: 'John Doe',
            doctorSpecialization: 'Cardiologist',
            patientName: 'Patient One',
            appointmentDate: new Date(Date.now() + 86400000).toISOString(),
            durationMinutes: 30,
            status: 'CANCELLED',
            symptomsSummary: 'Chest pain'
          }
        ]
      }
    }).as('getAppointmentsAfterCancel');

    cy.contains('Cancel').click();
    cy.wait('@cancelAppointment');
    cy.wait('@getAppointmentsAfterCancel');

    // Verify UI updates to show CANCELLED badge
    cy.contains('CANCELLED').should('be.visible');
  });

  it('allows a user to book a new appointment', () => {
    // Select a doctor
    cy.get('select').select('1');

    // Intercept fetching available slots for the selected doctor
    cy.intercept('GET', '**/api/appointments/available-slots*', {
      statusCode: 200,
      body: [
        { time: '10:00', available: true },
        { time: '10:30', available: false, reason: 'Booked' },
        { time: '11:00', available: true }
      ]
    }).as('getAvailableSlots');

    // Wait for the slot request
    cy.wait('@getAvailableSlots');

    // Ensure slots are visible (assuming BookingPanel renders buttons for them)
    cy.contains('10:00').should('be.visible');
    
    // Select the 10:00 slot
    cy.contains('10:00').click();

    // Type symptoms
    cy.get('textarea').type('Regular checkup for heart.');

    // Intercept booking POST request
    cy.intercept('POST', '**/api/appointments', {
      statusCode: 201,
      body: { status: 'SUCCESS' }
    }).as('bookAppointment');

    // Intercept refetch of appointments
    cy.intercept('GET', '**/api/appointments/patient', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 2,
            doctorName: 'John Doe',
            doctorSpecialization: 'Cardiologist',
            patientName: 'Patient One',
            appointmentDate: new Date().toISOString(),
            durationMinutes: 30,
            status: 'PENDING',
            symptomsSummary: 'Regular checkup for heart.'
          }
        ]
      }
    }).as('getAppointmentsAfterBooking');

    // Click Book
    cy.contains('Book').click();

    cy.wait('@bookAppointment');
    cy.wait('@getAppointmentsAfterBooking');

    // Verify success toast or UI state
    cy.contains('Appointment scheduled successfully').should('exist');
  });
});
