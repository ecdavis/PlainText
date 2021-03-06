
var SessionState = {
    "SessionClosed": 0,
    "SigningIn": 1,
    "SignedIn": 2
};

/**
 * This class gets instantiated for every user session. It's responsible for
 * authenticating users, signing up new users, and creating their characters.
 *
 * Right after instantiation, setSession() is called to set a reference to the
 * native Session object. You can use the setSessionState() method to
 * communicate the session state. Set the state to SessionState.SessionClosed
 * when you want the session to be closed, and to SessionState.SignedIn when a
 * user has been authenticated. Before entering the signed-in state you should
 * set the player object using the setPlayer() method.
 */
function SessionHandler() {

    var self = this;
    function send(message, color) {
        if (typeof message !== "string") {
            message = JSON.stringify(message);
        }
        message = Util.processHighlights(message);
        if (color !== undefined) {
            message = Util.colorize(message, color);
        }
        self.send(message);
    }

    var signUpData = {};

    this.states = {
        "AskingUserName": {
            "prompt": function() {
                send("What is your name? ");
            },
            "processInput": function(input) {
                var userName = Util.validateUserName(input.toLower());
                if (userName.length < 3) {
                    if (!userName.isEmpty()) {
                        send("I'm sorry, but your name should consist of at least 3 letters.\n");
                    }
                    return;
                }

                var player = Realm.getPlayer(userName);
                if (player) {
                    this.setPlayer(player);
                    this.setState("AskingPassword");
                } else if (Realm.reservedNames().contains(userName)) {
                    send("Yeah right, like I believe that...\n");
                } else {
                    signUpData.userName = userName;
                    this.setState("AskingUserNameConfirmation");
                }
            }
        },

        "AskingPassword": {
            "enter": function() {
                send({ "inputType": "password" });
            },
            "exit": function() {
                send({ "inputType": "text" });
            },
            "prompt": function() {
                send("Please enter your password: ");
            },
            "processInput": function(input) {
                if (this.player.matchesPassword(input)) {
                    LogUtil.logSessionEvent(this._session.source, "Authentication success for " +
                                            "player " + this.player.name);

                    if (this.player.isOnline()) {
                        send("Cannot sign you in because you're already signed in from another " +
                             "location.\n");
                        this.setState("SessionClosed");
                        return;
                    }

                    send("Welcome back, %1. Type *help* if you're feeling lost.\n"
                         .arg(this.player.name));
                    this.setState("SignedIn");
                }  else {
                    LogUtil.logSessionEvent(this._session.source, "Authentication failed for " +
                                            "player " + this.player.name);

                    send("Password incorrect.\n");
                }
            }
        },

        "AskingUserNameConfirmation": {
            "prompt": function() {
                send("%1, did I get that right? ".arg(signUpData.userName));
            },
            "processInput": function(input) {
                var answer = input.toLower();
                if (answer === "yes" || answer === "y") {
                    this.setState("AskingSignUpPassword");
                } else if (answer === "no" || answer === "n") {
                    this.setState("SignInAborted");
                } else {
                    send("Please answer with yes or no.\n");
                }
            }
        },

        "AskingSignUpPassword": {
            "enter": function() {
                send({ "inputType": "password" });
            },
            "prompt": function() {
                send("Please choose a password: ");
            },
            "processInput": function(input) {
                if (input.length < 6) {
                    send("Please choose a password of at least 6 characters.\n", Color.Red);
                    return;
                }
                if (input.toLower() === signUpData.userName.toLower()) {
                    send("Your password and your username may not be the same.\n", Color.Red);
                    return;
                }
                if (input === "123456" || input === "654321") {
                    send("Sorry, that password is too simple.\n", Color.Red);
                    return;
                }
                signUpData.password = input;
                this.setState("AskingSignUpPasswordConfirmation");
            }
        },

        "AskingSignUpPasswordConfirmation": {
            "exit": function() {
                send({ "inputType": "text" });
            },
            "prompt": function() {
                send("Please confirm your password: ");
            },
            "processInput": function(input) {
                if (signUpData.password === input) {
                    send("Password confirmed.\n", Color.Green);
                    this.setState("AskingRace");
                } else {
                    send("Passwords don't match.\n", Color.Red);
                    this.setState("AskingSignUpPassword");
                }
            }
        },

        "AskingRace": {
            "enter": function() {
                if (!signUpData.races) {
                    signUpData.races = {};
                    Realm.races().forEach(function(race) {
                        if (race.playerSelectable) {
                            signUpData.races[race.name.toLower()] = race;
                        }
                    });
                }

                send(("\n" +
                      "Please select which race you would like your character to be.\n" +
                      "\n" +
                      "Your race determines some attributes of the physique of your character, " +
                      "as well as where in the %1 you will start your journey.\n" +
                      "\n" +
                      "These are the major races in the %1:\n" +
                      "\n").arg(Realm.name) +
                     Util.formatColumns(signUpData.races.keys(),
                                        Options.Capitalized | Options.Highlighted));
            },
            "prompt": function() {
                send("\n" +
                     "Please select the race you would like to use, or type *info <race>* to get " +
                     "more information about a race.\n");
            },
            "processInput": function(input) {
                var answer = input.toLower();
                if (signUpData.races.contains(answer)) {
                    send("\nYou have chosen to become a %1.\n".arg(answer), Color.Green);
                    signUpData.race = signUpData.races[answer];
                    this.setState("AskingClass");
                } else if (answer.startsWith("info ")) {
                    var raceName = answer.mid(5).trimmed();
                    if (signUpData.races.contains(raceName)) {
                        var race = signUpData.races[raceName];
                        send("\n" + raceName.capitalized().highlighted() + "\n  " +
                             Util.splitLines(race.description, 78).join("\n  ") + "\n");
                    } else if (raceName.startsWith("<") && raceName.endsWith(">")) {
                        send("\nSorry, you are supposed to replace <race> with the name of an " +
                             "actual race. For example: *info human*.\n");
                    } else {
                        send("\nI don't know anything about the \"%1\" race.\n".arg(raceName));
                    }
                }
            }
        },

        "AskingClass": {
            "enter": function() {
                signUpData.classes = {};
                signUpData.race.classes.forEach(function(characterClass) {
                    signUpData.classes[characterClass.name.toLower()] = characterClass;
                });

                send("\n" +
                     "Please select which class you would like your character to be specialized " +
                     "in.\n" +
                     "Your class determines additional attributes of the physique of your " +
                     "character, and also can influence your choice to be good or evil.\n" +
                     "\n" +
                     "Note that the available classes are dependent on your choice of race. To " +
                     "revisit your choice of race, type *back*.\n" +
                     "\n" +
                     "These are the classes you may choose from:\n" +
                     "\n" +
                     Util.formatColumns(signUpData.classes.keys(),
                                        Options.Capitalized | Options.Highlighted));
            },
            "prompt": function() {
                send("\n" +
                     "Please select the class you would like to use, or type *info <class>* to " +
                     "get more information about a class.\n");
            },
            "processInput": function(input) {
                var answer = input.toLower();
                if (signUpData.classes.contains(answer)) {
                    send("\nYou have chosen to become a %1.\n".arg(answer), Color.Green);
                    signUpData.characterClass = signUpData.classes[answer];
                    this.setState("AskingGender");
                } else if (answer.startsWith("info ")) {
                    var className = answer.mid(5).trimmed();
                    if (signUpData.classes.contains(className)) {
                        var characterClass = signUpData.classes[className];
                        send("\n" + className.capitalized().highlighted() + "\n  " +
                              Util.splitLines(characterClass.description, 78).join("\n  ") + "\n");
                    } else if (className.startsWith("<") && className.endsWith(">")) {
                        send("\nSorry, you are supposed to replace <class> with the name of an " +
                             "actual race. For example: *info knight*.\n");
                    } else {
                        send("\nI don't know anything about the \"%1\" class.\n".arg(className));
                    }
                } else if (answer === "back" || answer === "b") {
                    this.setState("AskingRace");
                }
            }
        },

        "AskingGender": {
            "enter": function() {
                send("\n" +
                     "Please select which gender you would like your character to be.\n" +
                     "Your gender has a minor influence on the physique of your character.");
            },
            "prompt": function() {
                send("\n" +
                     "Please choose *male* or *female*.\n" +
                     "\n" +
                     "To revisit your choice of class, type *back*.\n");
            },
            "processInput": function(input) {
                var answer = input.toLower();
                if (answer === "male" || answer === "m") {
                    send("\nYou have chosen to be male.\n", Color.Green);
                    signUpData.gender = "male";
                    this.setState("AskingExtraStats");
                } else if (answer === "female" || answer === "f") {
                    send("\nYou have chosen to be female.\n", Color.Green);
                    signUpData.gender = "female";
                    this.setState("AskingExtraStats");
                } else  if (answer === "back" || answer === "b") {
                    this.setState("AskingClass");
                }
            }
        },

        "AskingExtraStats": {
            "enter": function() {
                var raceStats = signUpData.race.stats;
                var classStats = signUpData.characterClass.stats;

                signUpData.stats = raceStats.plus(classStats);
                signUpData.statsSuggestion = signUpData.race.statsSuggestion
                                             .plus(signUpData.characterClass.statsSuggestion);

                signUpData.height = signUpData.race.height;
                signUpData.weight = signUpData.race.weight;

                if (signUpData.characterClass.name === "knight") {
                    signUpData.weight += 10;
                } else if (signUpData.characterClass.name === "warrior" ||
                           signUpData.characterClass.name === "soldier") {
                    signUpData.weight += 5;
                } else if (signUpData.characterClass.name === "barbarian") {
                    signUpData.stats[4] = 0;
                    signUpData.weight += 5;

                    signUpData.statsSuggestion[FAITH] += signUpData.statsSuggestion[INTELLIGENCE];
                    signUpData.statsSuggestion.splice(INTELLIGENCE, 1);
                }

                if (signUpData.gender === "male") {
                    signUpData.stats[0]++;
                    signUpData.height += 10;
                    signUpData.weight += 10;
                } else {
                    signUpData.stats[1]++;
                    signUpData.weight -= 10;
                }

                send("\n" +
                     "You have selected to become a %1 %2 %3.\n"
                     .arg(signUpData.gender, signUpData.race.adjective,
                          signUpData.characterClass.name) +
                     "Your base character stats are: \n" +
                     "\n" +
                     "  *STR: %1*, *DEX: %2*, *VIT: %3*, *END: %4*, *INT: %5*, *FAI: %6*.\n"
                     .arg(signUpData.stats[0], signUpData.stats[1], signUpData.stats[2],
                          signUpData.stats[3], signUpData.stats[4], signUpData.stats[5]) +
                     "\n" +
                     "You may assign an additional 9 points freely over your various " +
                     "attributes.\n");
            },
            "prompt": function() {
                var isBarbarian = (signUpData.characterClass.name === "barbarian");

                send("\n" +
                     "Please enter the distribution you would like to use in the following " +
                     "form:\n" +
                     "\n" +
                     "  *%1*\n".arg(isBarbarian ? "<str> <dex> <vit> <end> <fai>" :
                                                  "<str> <dex> <vit> <end> <int> <fai>") +
                     "  (Replace every part with a number, for a total of 9. " +
                        "Suggestion: %1)\n".arg(signUpData.statsSuggestion.join(" ")) +
                     "\n" +
                     "To revisit your choice of gender, type *back*. If you want more " +
                     "information about character stats, type *info stats*. If you just want to " +
                     "accept the suggested stats, type *accept*.\n");
            },
            "processInput": function(input) {
                var answer = input.toLower();
                if (answer === "info stats") {
                    send("\n" +
                         "Your character has several attributes, each of which will have a value " +
                         "assigned. Collectively, we call these your character stats. Here is an " +
                         "overview:\n" +
                         "\n" +
                         "*Strength* (STR)\n" +
                         "  Strength primarily determines the power of your physical attacks. " +
                         "When\n" +
                         "  wielding a shield, it also gives a small defense power up.\n" +
                         "\n" +
                         "*Dexterity* (DEX)\n" +
                         "  Dexterity determines the speed with which attacks can be dealt. It " +
                         "also \n" +
                         "  improves your chances of evading enemy attacks, and the chance of " +
                         "success when\n" +
                         "  fleeing.\n" +
                         "\n" +
                         "*Vitality* (VIT)\n" +
                         "  Vitality primarily determines your max. health points (HP).\n" +
                         "\n" +
                         "*Endurance* (END)\n" +
                         "  Endurance primarily determines your physical defense power.\n" +
                         "\n" +
                         "*Intelligence* (INT)\n" +
                         "  Intelligence determines your max. magic points (MP).\n" +
                         "\n" +
                         "*Faith* (FAI)\n" +
                         "  Faith determines the magical defense power. It also decreases the " +
                         "chance that\n" +
                         "  a spell will fail when cast.\n");
                } else if (answer === "back" || answer === "b") {
                    this.setState("AskingGender");
                } else {
                    var isBarbarian = (signUpData.characterClass.name === "barbarian");

                    var stats;
                    if (answer === "accept suggestion" || answer === "accept" || answer === "a") {
                        stats = signUpData.statsSuggestion.clone();
                        if (isBarbarian) {
                            stats.splice(INTELLIGENCE, 0, 0);
                        }
                    } else {
                        var attributes = answer.split(/\s+/);
                        if (attributes.length !== (isBarbarian ? 5 : 6)) {
                            return;
                        }

                        stats = [
                            max(attributes[0].toInt(), 0),
                            max(attributes[1].toInt(), 0),
                            max(attributes[2].toInt(), 0),
                            max(attributes[3].toInt(), 0),
                            isBarbarian ? 0 : max(attributes[4].toInt(), 0),
                            max(attributes[isBarbarian ? 4 : 5].toInt(), 0)
                        ];
                    }

                    if (stats.total() !== 9) {
                        send("\nThe total of attributes should be 9.\n", Color.Red);
                        return;
                    }

                    signUpData.stats.add(stats);

                    signUpData.height += stats[INTELLIGENCE] - Math.floor(stats[DEXTERITY] / 2);
                    signUpData.weight += stats[STRENGTH];

                    send("\nYour character stats have been recorded.\n", Color.Green);
                    this.setState("AskingSignUpConfirmation");
                }
            }
        },

        "AskingSignUpConfirmation": {
            "enter": function() {
                send("\n" +
                     "You have selected to become a %1 %2 %3.\n"
                     .arg(signUpData.gender, signUpData.race.adjective,
                          signUpData.characterClass.name) +
                     "Your final character stats are: \n" +
                     "\n" +
                     "  *STR: %1*, *DEX: %2*, *VIT: %3*, *END: %4*, *INT: %5*, *FAI: %6*.\n"
                     .arg(signUpData.stats[0], signUpData.stats[1], signUpData.stats[2],
                          signUpData.stats[3], signUpData.stats[4], signUpData.stats[5]));
            },
            "prompt": function() {
                send("\n" +
                     "Are you ready to create a character with these stats?\n");
            },
            "processInput": function(input) {
                var answer = input.toLower();
                if (answer === "yes" || answer === "y") {
                    var player = Realm.getPlayer(signUpData.userName);
                    if (player) {
                        send("Uh-oh, it appears someone has claimed your character name while " +
                             "you were creating yours. I'm terribly sorry, but it appears you " +
                             "will have to start over.\n");
                        this.setState("SessionClosed");
                        return;
                    }

                    player = Realm.createObject("Player");
                    player.admin = Realm.players().isEmpty();
                    player.name = signUpData.userName;
                    player.race = signUpData.race;
                    player.characterClass = signUpData.characterClass;
                    player.gender = signUpData.gender;
                    player.stats = signUpData.stats;
                    player.height = signUpData.height;
                    player.weight = signUpData.weight;
                    player.currentRoom = signUpData.race.startingRoom;

                    player.hp = player.maxHp;
                    player.mp = player.maxMp;
                    player.gold = 100;

                    player.setPassword(signUpData.password);

                    signUpData = {};

                    LogUtil.logSessionEvent(this._session.source, "Character created for player " +
                                            player.name);

                    send("\nWelcome to %1, %2.\n".arg(Realm.name, player.name));

                    this.setPlayer(player);
                    this.setState("SignedIn");
                } else if (answer === "no" || answer === "n" ||
                           answer === "back" || answer === "b") {
                    this.setState("AskingExtraStats");
                } else {
                    send("Please answer with yes or no.\n");
                }
            }
        },

        "SignedIn": {
            "enter": function() {
                this.setSessionState(SessionState.SignedIn);
            }
        },

        "SignInAborted": {
            "enter": function() {
                send("Okay, bye.");
                this.setState("SessionClosed");
            }
        },

        "SessionClosed": {
            "enter": function() {
                this.setSessionState(SessionState.SessionClosed);
            }
        }
    };

    this.state = null;

    this.player = null;

    this._session = null;
}

SessionHandler.prototype.setSession = function(session) {

    this._session = session;

    this.setState("AskingUserName");
    if (this.state.prompt) {
        this.state.prompt.call(this);
    }
};

SessionHandler.prototype.setState = function(name) {

    if (this.states[name] === this.state) {
        return;
    }

    if (this.state && this.state.exit) {
        this.state.exit.call(this);
    }

    this.state = this.states[name];

    if (this.state.enter) {
        this.state.enter.call(this);
    }
};

SessionHandler.prototype.setPlayer = function(player) {

    this.player = player;

    this._session.setPlayer(player);
};

SessionHandler.prototype.setSessionState = function(sessionState) {

    this._session.setSessionState(sessionState);
};

SessionHandler.prototype.send = function(message) {

    this._session.send(message);
};

SessionHandler.prototype.processSignIn = function(input) {

    this.state.processInput.call(this, input);

    if (this.state.prompt) {
        this.state.prompt.call(this);
    }
};
