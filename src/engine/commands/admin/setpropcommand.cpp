#include "setpropcommand.h"


SetPropCommand::SetPropCommand(Character *character, QObject *parent) :
    AdminCommand(character, parent) {
}

SetPropCommand::~SetPropCommand() {
}

void SetPropCommand::execute(const QString &command) {

    setCommand(command);

    /*QString alias = */takeWord();

    GameObjectPtrList objects = takeObjects(currentArea()->items() + currentArea()->exits());
    if (!requireUnique(objects, "Object not found.", "Object is not unique.")) {
        return;
    }

    QString propertyName = takeWord();
    QString value = takeRest();

    QVariant variant;
    switch (variant.type()) {
        case QVariant::Bool:
            variant = (value == "true");
            break;
        case QVariant::Int:
            variant = value.toInt();
            break;
        case QVariant::String:
            variant = value;
            break;
        case QVariant::UserType:
            if (variant.userType() == QMetaType::type("GameObjectPtr")) {
                variant = QVariant::fromValue(GameObjectPtr::fromString(value));
                break;
            } else if (variant.userType() == QMetaType::type("GameObjectPtrList")) {
                try {
                    GameObjectPtrList pointerList;
                    foreach (QString string, value.split(' ')) {
                        pointerList << GameObjectPtr::fromString(string);
                    }
                    variant = QVariant::fromValue(pointerList);
                } catch (BadGameObjectException exception) {
                    character()->send(exception.what());
                }
                break;
            }
        default:
            character()->send(QString("Setting property %1 is not supported.").arg(propertyName));
    }

    if (variant.isValid()) {
        objects[0]->setProperty(propertyName.toAscii().constData(), variant);

        character()->send(QString("Property %1 modified.").arg(propertyName));
    }
}
