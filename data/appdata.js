module.exports = {
  getNavMenu: function() {
  	return {
  		menus: [
  			{
  				name: '회원관리',
  				href: '/users',
  			},
  			{
  				name: '사망진단서',
  				href: '/obituary',
  			},
  			{
  				name: '문자발송',
  				href: '/sms',
  			},
  		],
  	};
  },

};
