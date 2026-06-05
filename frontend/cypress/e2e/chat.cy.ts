describe('AI Chatbot Flow', () => {
  beforeEach(() => {
    // Stub the authentication state (assuming token is stored in localStorage or cookie)
    // For this test, we'll assume the app allows navigation if we stub the API correctly.
    
    // Intercept auth to bypass login
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        id: 1,
        username: 'patient1',
        roles: ['ROLE_PATIENT']
      }
    }).as('getAuth');

    // Intercept chat history
    cy.intercept('GET', '**/api/chat/history', {
      statusCode: 200,
      body: [
        {
          id: 1,
          message: 'Hello! I am your AI Health Assistant. How can I help you today?',
          isFromAi: true,
          timestamp: new Date().toISOString()
        }
      ]
    }).as('getHistory');

    // Visit the chat page
    cy.visit('/dashboard/chat');
    cy.wait(['@getAuth', '@getHistory']);
  });

  it('loads chat history and displays the initial AI message', () => {
    cy.get('.chat-bubble-ai').should('exist');
    cy.contains('Hello! I am your AI Health Assistant').should('be.visible');
  });

  it('allows the user to send a message and receive an AI response', () => {
    // Intercept the send message API
    cy.intercept('POST', '**/api/chat/ai-chat', {
      statusCode: 200,
      body: {
        id: 2,
        message: 'I understand you have a headache. I suggest drinking water and resting. [Action: Suggest Doctor Appointment]',
        isFromAi: true,
        timestamp: new Date().toISOString()
      },
      delay: 500 // Simulate network delay to see typing indicator
    }).as('sendMessage');

    // Type a message
    const testMessage = 'I have a terrible headache';
    cy.get('textarea[placeholder*="Type a message"]').type(testMessage);
    
    // Send message
    cy.get('button[type="submit"]').click();

    // Verify user message appears immediately
    cy.get('.chat-bubble-user').last().should('contain.text', testMessage);

    // Verify typing indicator appears
    cy.get('.flex.items-center.gap-1').children('.w-2.h-2.rounded-full').should('have.length', 3);

    // Wait for AI response
    cy.wait('@sendMessage');

    // Verify AI response appears
    cy.get('.chat-bubble-ai').last().should('contain.text', 'I understand you have a headache');

    // Verify Doctor Suggestion component renders based on the AI response
    cy.contains('Suggested Actions').should('be.visible');
    cy.contains('Suggest Doctor Appointment').should('be.visible');
  });

  it('handles API errors gracefully when sending a message', () => {
    // Intercept the send message API and force an error
    cy.intercept('POST', '**/api/chat/ai-chat', {
      statusCode: 500,
      body: 'Internal Server Error'
    }).as('sendMessageError');

    // Type and send
    cy.get('textarea[placeholder*="Type a message"]').type('Hello');
    cy.get('button[type="submit"]').click();
    cy.wait('@sendMessageError');

    // Verify error message is shown as an AI message
    cy.get('.chat-bubble-ai').last().should('contain.text', 'Sorry, the AI service encountered an error');
  });
});
