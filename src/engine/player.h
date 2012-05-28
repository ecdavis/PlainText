#ifndef PLAYER_H
#define PLAYER_H

#include "character.h"
#include "gameobjectptr.h"

#include <QString>


class Session;

class Player : public Character {

    Q_OBJECT

    public:
        explicit Player(uint id, Options options = NoOptions);
        virtual ~Player();

        virtual void setName(const QString &name);

        const QString &passwordHash() const { return m_passwordHash; }
        virtual void setPasswordHash(const QString &passwordHash);
        Q_PROPERTY(QString passwordHash READ passwordHash WRITE setPasswordHash)

        bool isAdmin() const { return m_admin; }
        virtual void setAdmin(bool admin);
        Q_PROPERTY(bool admin READ isAdmin WRITE setAdmin)

        Session *session() const { return m_session; }
        void setSession(Session *session);

        virtual void send(const QString &message);

        virtual void enter(const GameObjectPtr &area);
        virtual void leave(const GameObjectPtr &area, const QString &exitName = QString());

        virtual void look();

        virtual void die();

    signals:
        void write(const QString &data);

    protected:
        virtual void timerEvent(QTimerEvent *event);

    private:
        QString m_passwordHash;

        GameObjectPtr m_currentArea;

        GameObjectPtrList m_inventory;

        int m_regenerationInterval;

        bool m_admin;

        Session *m_session;
};

#endif // PLAYER_H
