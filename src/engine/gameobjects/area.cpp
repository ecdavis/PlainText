#include "area.h"

#include "logutil.h"
#include "room.h"


#define super GameObject

Area::Area(Realm *realm, uint id, Options options) :
    super(realm, GameObjectType::Area, id, options) {
}

Area::~Area() {
}

void Area::addRoom(const GameObjectPtr &roomPtr) {

    if (!m_rooms.contains(roomPtr)) {
        m_rooms.append(roomPtr);

        Room *room = roomPtr.cast<Room *>();
        if (!room->area().isNull()) {
            Area *other = room->area().cast<Area *>();
            other->removeRoom(roomPtr);
        }
        room->setArea(this);

        setModified();
    }
}

void Area::removeRoom(const GameObjectPtr &room) {

    if (m_rooms.removeOne(room)) {
        room.cast<Room *>()->setArea(GameObjectPtr());

        setModified();
    }
}

void Area::setRooms(const GameObjectPtrList &rooms) {

    if (m_rooms != rooms) {
        m_rooms = rooms;

        setModified();
    }
}

void Area::init() {

    try {
        // guarantee our rooms list us, this allows Room::area to become a
        // non-stored property, saving some redundancy
        GameObjectPtr pointer(this);
        for (const GameObjectPtr &room : m_rooms) {
            room.cast<Room *>()->setArea(pointer);
        }

        super::init();
    } catch (GameException &exception) {
        LogUtil::logError("Exception in Area::init(): %1", exception.what());
    }
}

