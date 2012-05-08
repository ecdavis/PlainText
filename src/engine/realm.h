#ifndef REALM_H
#define REALM_H

#include <QHash>

#include "gameobject.h"


class Character;
class GameObjectSyncThread;

class Realm : public GameObject {

    Q_OBJECT

    public:
        static Realm *instance() { Q_ASSERT(s_instance); return s_instance; };

        static void instantiate();
        static void destroy();

        bool isInitialized() const { return m_initialized; }

        void registerObject(GameObject *gameObject);
        void unregisterObject(GameObject *gameObject);
        GameObject *getObject(const char *objectType, uint id) const;

        void registerCharacter(Character *character);
        void unregisterCharacter(Character *character);
        Character *getCharacter(const QString &name) const;

        uint uniqueObjectId();

        void syncObject(GameObject *gameObject);

        static QString saveDirPath();
        static QString saveObjectPath(const char *objectType, uint id);

    private:
        static Realm *s_instance;

        bool m_initialized;

        uint m_nextId;
        QHash<uint, GameObject *> m_objectMap;
        QHash<QString, Character *> m_characterMap;

        GameObjectSyncThread *m_syncThread;

        explicit Realm();
        virtual ~Realm();
};

#endif // REALM_H
