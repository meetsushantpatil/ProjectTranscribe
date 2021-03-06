var WildRydes = window.WildRydes || {};

_config = {
    cognito: {
        userPoolId: 'us-east-1_aXUwkRmhG', // e.g. us-east-2_uXboG5pAb
        userPoolClientId: '5126qp1em1gpatk1q152i8nf53', // e.g. 25ddkmj4v6hfsfvruhpfi7n4hv
        region: 'us-east-1' // e.g. us-east-2
    },
    api: {
        invokeUrl: 'https://vj4fmlljh4.execute-api.us-east-1.amazonaws.com/prod' // e.g. https://rc7nyt4tql.execute-api.us-west-2.amazonaws.com/prod',
    }
};



(function scopeWrapper($) {
    var signinUrl = '/signin.html';

    var poolData = {
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId
    };

    var userPool;

    if (!(_config.cognito.userPoolId &&
        _config.cognito.userPoolClientId &&
        _config.cognito.region)) {
        $('#noCognitoMessage').show();
        return;
    }

    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    WildRydes.signOut = function signOut() {
        userPool.getCurrentUser().signOut();
    };

    WildRydes.authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var cognitoUser = userPool.getCurrentUser();

        if (cognitoUser) {
            cognitoUser.getSession(function sessionCallback(err, session) {
                if (err) {
                    reject(err);
                } else if (!session.isValid()) {
                    resolve(null);
                } else {
                    resolve(session.getIdToken().getJwtToken());
                }
            });
        } else {
            resolve(null);
        }
    });


    /*
     * Cognito User Pool functions
     */

    function register(email, password, onSuccess, onFailure) {
        var dataEmail = {
            Name: 'email',
            Value: email
        };
        var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);

        userPool.signUp(toUsername(email), password, [attributeEmail], null,
            function signUpCallback(err, result) {
                if (!err) {
                    onSuccess(result);
                } else {
                    onFailure(err);
                }
            }
        );
    }

    function signin(email, password, onSuccess, onFailure) {
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
            Username: toUsername(email),
            Password: password
        });

        window.userName = email
        // console.log(window.userName)
        sessionStorage.setItem("userName", email);

        var cognitoUser = createCognitoUser(email);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: onSuccess,
            onFailure: onFailure
        });
    }

    function verify(email, code, onSuccess, onFailure) {
        createCognitoUser(email).confirmRegistration(code, true, function confirmCallback(err, result) {
            if (!err) {
                onSuccess(result);
            } else {
                onFailure(err);
            }
        });
    }

    function createCognitoUser(email) {
        return new AmazonCognitoIdentity.CognitoUser({
            Username: toUsername(email),
            Pool: userPool
        });
    }

    function toUsername(email) {
        return email.replace('@', '-at-');
    }

    /*
     *  Event Handlers
     */

    $(function onDocReady() {
        $('#signinForm').submit(handleSignin);
        $('#registrationForm').submit(handleRegister);
        $('#verifyForm').submit(handleVerify);
        $('#trascribe-file').click(uploadFile);
        $('#checkstatusForm').submit(getStatus);
        var el = document.getElementById("file");
        el.addEventListener("change", readFile, false);
    });

    function handleSignin(event) {
        var email = $('#emailInputSignin').val();
        var password = $('#passwordInputSignin').val();
        event.preventDefault();
        signin(email, password,
            function signinSuccess() {
                window.location.href = 'transcribe.html';
                console.log('Successfully Logged In');
            },
            function signinError(err) {
                alert(err);
            }
        );
    }

    function handleRegister(event) {
        var email = $('#emailInputRegister').val();
        var password = $('#passwordInputRegister').val();
        var password2 = $('#password2InputRegister').val();

        var onSuccess = function registerSuccess(result) {
            var cognitoUser = result.user;
            console.log('user name is ' + cognitoUser.getUsername());
            var confirmation = ('Registration successful. Please check your email inbox or spam folder for your verification code.');
            if (confirmation) {
                window.location.href = 'verify.html';
            }
        };
        var onFailure = function registerFailure(err) {
            alert(err);
        };
        event.preventDefault();

        if (password === password2) {
            register(email, password, onSuccess, onFailure);
        } else {
            alert('Passwords do not match');
        }
    }

    function handleVerify(event) {
        var email = $('#emailInputVerify').val();
        var code = $('#codeInputVerify').val();
        event.preventDefault();
        verify(email, code,
            function verifySuccess(result) {
                console.log('call result: ' + result);
                console.log('Successfully verified');
                alert('Verification successful. You will now be redirected to the login page.');
                window.location.href = signinUrl;
            },
            function verifyError(err) {
                alert(err);
            }
        );
    }

    function readFile(event) {
        var file = event.target.files[0];
        console.log(file.type)
        window.reader = new FileReader();
        window.reader.onload = function(e) {
          // The file's text will be printed here
          window.fileContent = e.target.result
          window.filename = file.name
        };
      
        window.reader.readAsArrayBuffer(file);
      }

    function uploadFile(event){
        var requestBody = {
            "fileName": window.filename,
            "userName": sessionStorage.getItem("userName")
        }
        $.ajax({
            method: "GET",
            url: "https://kgpxgx8285.execute-api.us-east-1.amazonaws.com/prod/getuploadlink",
            data: requestBody
          }).done(function(data){
            var xhr = new XMLHttpRequest();
            console.log(data.uploadUrl)
            console.log(sessionStorage.getItem("userName"))
            xhr.open('PUT', data.uploadUrl, true);
            xhr.send(window.fileContent);
          })
    }

    function getStatus(event){
        event.preventDefault();
        console.log("Reached getStatus Call")
        var requestBody = {
            "RequestId": $('#requestId').val(),
            "UserName": $('#emailInputSignin').val()
        }
        $.ajax({
            method: "GET",
            url: "https://kgpxgx8285.execute-api.us-east-1.amazonaws.com/prod/getrequeststatus",
            data: requestBody
          }).done(function(data){
            console.log(data)
            if(data.Item.Status.S == "COMPLETED"){
            $.ajax({
                method: "GET",
                url: "https://kgpxgx8285.execute-api.us-east-1.amazonaws.com/prod/getdownloadlink",
                data: requestBody
              }).done(function(data){
                // window.alert("Your Request is complete." + "Output can be found here :" + JSON.stringify(data.uploadUrl))
                $('a#output_link').attr("href",JSON.stringify(data.uploadUrl))
                $('#result').text("Your Request is complete." + "Output can be found" );
              })
            }
            else{
                window.alert("Your Request is still not complete, try again later.")
            }
          })
    }

}(jQuery));

