module.exports = {
  getNavMenu: function() {
  	return {
  		menus: [
  			{
  				name: '회원관리',
  				href: '/users',
  			},
  			{
  				name: '부고알림',
  				href: '/obituary',
  			},
        {
  				name: 'Q & A',
  				href: '/qna',
  			},
  		],
  	};
  },
};
