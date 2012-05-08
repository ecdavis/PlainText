#ifndef AREA_H
#define AREA_H

#include "gameobject.h"
#include "gameobjectptr.h"


class Character;

class Area : public GameObject {

    Q_OBJECT

    public:
        explicit Area(uint id, Options options = NoOptions);
        virtual ~Area();

        const GameObjectPtrList &exits() const { return m_exits; }
        virtual void addExit(const GameObjectPtr &exit);
        virtual void removeExit(const GameObjectPtr &exit);
        virtual void setExits(const GameObjectPtrList &exits);
        Q_PROPERTY(GameObjectPtrList exits READ exits WRITE setExits);

        const GameObjectPtrList &characters() const { return m_characters; }
        virtual void addCharacter(const GameObjectPtr &character);
        virtual void removeCharacter(const GameObjectPtr &character);
        virtual void setCharacters(const GameObjectPtrList &presentCharacters);
        Q_PROPERTY(GameObjectPtrList characters READ characters WRITE setCharacters STORED false);

        const GameObjectPtrList &items() const { return m_items; }
        virtual void addItem(const GameObjectPtr &item);
        virtual void removeItem(const GameObjectPtr &item);
        virtual void setItems(const GameObjectPtrList &items);
        Q_PROPERTY(GameObjectPtrList items READ items WRITE setItems);

        void enter(Character *character);
        void leave(Character *character, const QString &exitName = QString::null);

    private:
        GameObjectPtrList m_exits;
        GameObjectPtrList m_characters;
        GameObjectPtrList m_items;
};

#endif // AREA_H
