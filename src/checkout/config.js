angular.module('mx.checkout').constant('mxCheckoutConfig', {
  fields: {
    card: {
      id: 'card_number',
      // placeholder: 'Card number',
      text: 'Card number',
      label: true,
      size: '19',
      pattern: '[0-9]{14,19}',
      valid: 'ccard,required'
    },
    expireMonth: {
      id: 'expiry_month',
      placeholder: 'MM',
      text: 'Expiration',
      label: true,
      size: '2',
      pattern: '[0-9]{2}',
      valid: 'exp_date,required',
      bind: 'expiry_year',
      format: 'month'
    },
    expireYear: {
      id: 'expiry_year',
      placeholder: 'YY',
      label: true,
      size: '2',
      pattern: '[0-9]{2}',
      valid: 'exp_date,required',
      bind: 'expiry_month',
      format: 'year'
    },
    cvv: {
      id: 'cvv2',
      // placeholder: 'CVV',
      text: 'Security Code',
      label: true,
      info:
        'CVV/CVC2 – this 3-digits are security code. It is located in the signature field on the back of your payment card (last three digits)',
      size: '3',
      pattern: '[0-9]{3}',
      valid: 'cvv2,required'
    },
    name: {
      id: 'name',
      placeholder: 'Name',
      text: 'Name',
      label: true,
      valid: 'required'
    },
    email: {
      id: 'email',
      placeholder: 'Email',
      text: 'Email',
      label: true,
      valid: 'required'
    },
    phone: {
      id: 'phone',
      placeholder: 'Phone',
      text: 'Phone',
      label: true,
      valid: 'required'
    }
  },
  error: {
    required: 'Required field',
    ccard: 'Credit card number is invalid',
    exp_date: 'Invalid expiry date',
    cvv2: 'Incorrect CVV2 format',
    card: "Please verify that all card information you've provided is accurate and try again"
  },
  tabs: {
    card: {
      id: 'card',
      icons: ['visa', 'master', 'american', 'discover'],
      name: 'Credit or Debit Card',
      payment_systems: {
        card: {
          formMap: ['card_number', 'expiry_month', 'expiry_year', 'cvv2']
        }
      }
    },
    emoney: {
      id: 'emoney',
      icons: [],
      name: 'Electronic money',
      payment_systems: {
        webmoney: {
          name: 'Webmoney',
          formMap: ['phone', 'email']
        }
      }
    },
    ibank: {
      id: 'ibank',
      icons: [],
      name: 'Internet-banking',
      payment_systems: {
        p24: {
          name: 'Приват24',
          formMap: ['name', 'email']
        },
        plotva24: {
          name: 'PLATBA 24'
        }
      }
    }
  }
});
