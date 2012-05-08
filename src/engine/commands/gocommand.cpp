#include "gocommand.h"

#include "engine/exit.h"


GoCommand::GoCommand(Character *character, QObject *parent) :
    Command(character, parent) {
}

GoCommand::~GoCommand() {
}

void GoCommand::execute(const QString &command) {

    setCommand(command);

    /*QString alias = */takeWord();
    if (!assertWordsLeft("Go where?")) {
        return;
    }

    GameObjectPtrList exits = takeObjects(currentArea()->exits());
    if (!requireUnique(exits, "You can't go that way.", "Exit is not unique.")) {
        return;
    }

    currentArea()->leave(character(), exits[0]->name());
    exits[0].cast<Exit *>()->destinationArea().cast<Area *>()->enter(character());
}
