$(document).ready(function(){

  // Put in something to prevent them from spending money when the balance is negative. It's a virtual envelope, not an account.
  $('#spendForm').on('submit', function(e){
  	e.preventDefault();
  	var amount = $('#envelopeAmount').val();
  	var intized = intizeAmount(amount);
  	$('#envelopeAmount').val(intized);
  	var serial = $(this).serialize();
    var action = $(this).attr('action');
    $.post(action, serial, function(data){
      location.reload();
    });
  });

  $('#envelopeAddForm').on('submit', function(e){
  	e.preventDefault();
  	console.log('submitted');
  	var amountSelector = $('#envelopeAddForm > #envelopeAmount')
  	var amount = amountSelector.val();
  	var intized = intizeAmount(amount);
  	amountSelector.val(intized);
  	var serial = $(this).serialize();
    var action = $(this).attr('action');
    $.post(action, serial, function(data){
      location.reload();
    });
  });

  $('#envelopeResetForm').on('submit', function(e){
    e.preventDefault();
  	console.log('submitted');
  	var amountSelector = $('#resetAmount')
  	var amount = amountSelector.val();
  	var intized = intizeAmount(amount);
  	amountSelector.val(intized);
  	
  	var serial = $(this).serialize();
    var action = $(this).attr('action');
    $.post(action, serial, function(data){
      location.reload();
    });
  });

});


function intizeAmount(amount){
	if(amount.indexOf('.') == -1) {
		var newAmount = amount * 100;
		console.log(newAmount);
		return newAmount;
	} else {
		var split = amount.split('.');
		if(split[0] > 0){
		  var newAmount = parseInt((split[0]+split[1]));

		} else {
			var newAmount = parseInt(split[1]);
		}
		
		console.log(newAmount);
		return newAmount;
	}
}


